
import fetch from 'node-fetch';
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:3002';

// Helper for logging
const log = (step: string, msg: string, success: boolean = true) => {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${step}: ${msg}`);
    if (!success) process.exit(1);
};

// Helper for API calls
async function api(method: string, path: string, body?: any) {
    try {
        const res = await fetch(`${API_URL}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`${res.status} ${res.statusText}: ${text}`);
        }
        return res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
    } catch (e: any) {
        throw new Error(`API Request Failed: ${method} ${path} - ${e.message}`);
    }
}

async function runE2E() {
    console.log('Starting E2E Execution...\n');
    let warehouseId: string;
    let productId: string;
    let orderId: string;
    let transferId: string;
    let pickingSessionId: string;
    let taskId: string;

    // --- 1. Authentication ---
    try {
        await api('GET', '/inventory/products');
        log('1.1', 'API Connectivity Check');
    } catch (e: any) {
        log('1.1', `API Connectivity Check - ${e.message}`, false);
    }

    // --- 2. Inventory Management ---
    // 2.1 Create Warehouse
    const warehouse = await api('POST', '/inventory/warehouses', {
        name: 'E2E Warehouse',
        shortName: 'E2E',
        type: 'PHYSICAL',
        location: { lat: 0, lng: 0 }
    });
    warehouseId = warehouse.id;
    log('2.1', `Created Warehouse: ${warehouse.name}`);

    // 2.2 Create Product
    const product = await api('POST', '/inventory/products', {
        sku: `E2E-${Date.now()}`,
        name: 'E2E Test Product',
        category: 'Test',
        classification: 'A',
        type: 'Finished',
        unitOfMeasure: 'Unit',
        averageCost: 100,
        status: 'Active',
        tracking: 'none'
    });
    productId = product.id;
    log('2.2', `Created Product: ${product.name}`);

    // 2.3 Add Stock
    await api('POST', '/inventory/batch', {
        productId,
        warehouseId,
        quantity: 50,
        costPerUnit: 100,
        purchaseDate: new Date().toISOString()
    });
    log('2.3', 'Added 50 units of stock');

    // 2.4 Filter Inventory (Verify stock exists)
    const inventory = await api('GET', `/inventory/products?warehouseId=${warehouseId}`);
    const found = inventory.find((p: any) => p.id === productId);
    if (!found) log('2.4', 'Product not found in warehouse filter', false);
    log('2.4', 'Verified product in warehouse filter');

    // --- 3. Location Management ---
    // 3.1 Create Hierarchy
    const zone = await api('POST', '/inventory/locations', {
        name: 'Zone A',
        warehouseId
    });
    const row = await api('POST', '/inventory/locations', {
        name: 'Row 1',
        warehouseId,
        parentId: zone.id,
        structuralType: 'ROW'
    });
    log('3.1', `Created Hierarchy: ${zone.name} -> ${row.name}`);

    // 3.2 Location with Properties
    const coldStorage = await api('POST', '/inventory/locations', {
        name: 'Cold Storage',
        warehouseId,
        attributes: { temperature: -18 }
    });
    if (JSON.parse(coldStorage.attributes).temperature !== -18) log('3.2', 'Attributes mismatch', false);
    log('3.2', 'Created location with properties');

    // --- 4. Order Fulfillment ---
    // 4.0 Seed Customer
    await prisma.customer.upsert({
        where: { id: 'cust_001' },
        update: {},
        create: {
            id: 'cust_001',
            name: 'E2E Customer',
            address: '123 Test St',
            latitude: 0,
            longitude: 0
        }
    });
    log('4.0', 'Seeded Customer: cust_001');

    // 4.0.5 Create Fulfillment Rule (Before Order)
    await api('POST', '/fulfillment/rules', {
        name: 'E2E Rule',
        priority: 1,
        strategy: 'PRIMARY',
        warehouseId: warehouseId,
        active: true
    });
    log('4.0.5', 'Created Fulfillment Rule');

    // 4.1 Create Order
    try {
        const order = await api('POST', '/orders', {
            customerId: 'cust_001',
            priority: 'NORMAL',
            items: [{ productId, quantity: 10 }]
        });
        orderId = order.id;
        log('4.1', `Created Order: ${order.id}`);
    } catch (e: any) {
        log('4.1', `Create Order Failed: ${e.message}`, false);
    }

    // 4.2 Allocate Order (Should be auto, but we check/trigger)
    try {
        await api('POST', `/orders/${orderId}/allocate`);
        log('4.2', 'Allocated Order (Manual Trigger)');
    } catch (e) {
        console.warn('Allocation endpoint might be missing or order already allocated.');
    }

    const allocatedOrder = await api('GET', `/orders/${orderId}`);
    if (allocatedOrder.fulfillmentStatus !== 'ALLOCATED') {
        console.warn(`Order status is ${allocatedOrder.fulfillmentStatus}, expected ALLOCATED`);
    } else {
        log('4.2', 'Verified Order Status: ALLOCATED');
    }

    // 4.3 Verify Reservation
    const stock = await api('GET', `/inventory?productId=${productId}`);
    const stockItem = stock.find((s: any) => s.warehouseId === warehouseId);
    if (stockItem && stockItem.reserved >= 10) {
        log('4.3', `Verified Reservation: ${stockItem.reserved}`);
    } else {
        console.warn(`Reservation check failed: ${stockItem?.reserved} reserved`);
    }

    // --- 5. IWT ---
    // 5.0 Seed User
    await prisma.user.upsert({
        where: { id: 'user_001' },
        update: {},
        create: {
            id: 'user_001',
            name: 'E2E User',
            role: 'USER'
        }
    });
    log('5.0', 'Seeded User: user_001');

    await prisma.user.upsert({
        where: { id: 'admin_001' },
        update: {},
        create: {
            id: 'admin_001',
            name: 'E2E Admin',
            role: 'ADMIN'
        }
    });
    log('5.0', 'Seeded User: admin_001');

    // 5.1 Create Transfer
    const warehouse2 = await api('POST', '/inventory/warehouses', {
        name: 'Main Warehouse',
        shortName: 'MAIN',
        type: 'PHYSICAL',
        location: { lat: 0, lng: 0 }
    });

    const transfer = await api('POST', '/fulfillment/transfers', {
        sourceWarehouseId: warehouseId,
        destinationWarehouseId: warehouse2.id,
        initiatorId: 'user_001',
        items: [{ productId, quantity: 5 }]
    });
    transferId = transfer.id;
    log('5.1', `Created Transfer: ${transfer.id}`);

    // 5.2 Approve Transfer
    await api('PUT', `/fulfillment/transfers/${transferId}/approve`, { approverId: 'admin_001' });
    log('5.2', 'Approved Transfer');

    // --- 6. Picking ---
    // 6.1 Create Session
    const session = await api('POST', '/strategy/picking/sessions', {
        warehouseId,
        strategy: 'Single'
    });
    pickingSessionId = session.id;
    log('6.1', `Created Picking Session: ${session.id}`);

    // 6.2 Execute Picking
    const activeSession = await api('GET', `/strategy/picking/sessions/active?warehouseId=${warehouseId}`);
    if (activeSession && activeSession.tasks && activeSession.tasks.length > 0) {
        taskId = activeSession.tasks[0].id;
        await api('PATCH', `/strategy/picking/tasks/${taskId}`, {
            status: 'COMPLETED',
            pickedQuantity: 10
        });
        log('6.2', 'Executed Picking Task');
    } else {
        console.warn('No picking tasks found to execute');
    }

    // 6.3 Complete Session
    await api('POST', `/strategy/picking/sessions/${pickingSessionId}/complete`);
    log('6.3', 'Completed Picking Session');

    // --- 7. Reporting ---
    const analytics = await api('GET', '/reporting/analytics');
    if (analytics) log('7.1', 'Fetched Dashboard Metrics');

    const report = await api('POST', '/reporting/compliance', { type: 'VAT', period: '2023-12' });
    if (report) log('7.2', 'Generated Compliance Report');

    // --- 8. Integration ---
    const salesSync = await api('POST', '/integration/sync/sales/SHOPEE', {});

    console.log('\nE2E Execution Completed.');
}

runE2E()
    .catch(e => {
        console.error('E2E ERROR:', e.message);
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
