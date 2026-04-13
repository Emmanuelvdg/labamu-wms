import { PrismaClient } from '@labamu/database';

const API_BASE = 'http://localhost:3001';
const ADMIN_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';

const prisma = new PrismaClient();

async function request(path: string, options: any = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': ADMIN_ID,
        ...options.headers
    };

    try {
        const res = await fetch(url, { ...options, headers });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body };
    } catch (e: any) {
        return { status: 500, error: e.message };
    }
}

async function runTests() {
    console.log('🚀 Starting Full Platform Regression Tests');

    const results: any[] = [];

    const logTest = (module: string, id: string, name: string, res: any, expectedStatus: number) => {
        const passed = res.status === expectedStatus || (expectedStatus === 201 && res.status === 200);
        console.log(`[${passed ? '✅' : '❌'}] ${module} ${id}: ${name} (${res.status})`);
        results.push({ module, id, name, status: res.status, passed, body: res.body });
        return passed;
    };

    // --- Module 5: Warehouses & Locations ---
    console.log('\n--- Module 5: Warehouses & Locations ---');
    const dcId = '2bebad55-ce93-42e9-8dc9-b6fec5fdb229';

    // 5.1 List
    logTest('M5', '5.1', 'List Warehouses', await request('/inventory/warehouses'), 200);

    // 5.2 Create (Need type: PHYSICAL)
    const res52 = await request('/inventory/warehouses', {
        method: 'POST',
        body: JSON.stringify({ name: "Test Warehouse script", shortName: "TWS", type: "PHYSICAL", status: "Enabled" })
    });
    logTest('M5', '5.2', 'Create Warehouse', res52, 201);
    const twsId = res52.body.id;

    if (twsId) {
        logTest('M5', '5.3', 'Update Warehouse', await request(`/inventory/warehouses/${twsId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: "Test Warehouse script Updated" })
        }), 200);

        // Clean up
        await request(`/inventory/warehouses/${twsId}`, { method: 'DELETE' });
    }

    logTest('M5', '5.5', 'Location Tree', await request(`/inventory/locations/tree?warehouseId=${dcId}`), 200);

    const res56 = await request(`/inventory/locations?warehouseId=${dcId}`);
    logTest('M5', '5.6', 'Flat List', res56, 200);
    const bins = res56.body.filter((l: any) => l.structuralType === 'POSITION');
    const binId = bins[0]?.id;

    if (binId) {
        logTest('M5', '5.11', 'Location Details', await request(`/inventory/locations/${binId}`), 200);
        logTest('M5', '5.12', 'Location Utilisation', await request(`/inventory/locations/${binId}/utilisation`), 200);
    }

    // --- Module 11: Purchase Orders (Corrected Module Number from Plan) ---
    console.log('\n--- Module 11: Purchase Orders ---');
    logTest('M11', '11.1', 'List POs', await request('/inventory/purchase-orders'), 200);

    const productRes = await request('/inventory/products');
    const products = productRes.body;
    const prod1 = products[0];

    // Create PO
    const res113 = await request('/inventory/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
            supplierId: 'some-supplier-id', // Need real ID
            warehouseId: dcId,
            items: [{ productId: prod1.id, quantity: 10, unitPrice: 1000 }]
        })
    });
    // Need to find a real supplier ID first.
    const suppliers = await request('/inventory/suppliers');
    const vendorId = suppliers.body[0]?.id;

    if (vendorId) {
        const res113_retry = await request('/inventory/purchase-orders', {
            method: 'POST',
            body: JSON.stringify({
                supplierId: vendorId,
                warehouseId: dcId,
                items: [{ productId: prod1.id, quantity: 10, unitPrice: 1000 }]
            })
        });
        logTest('M11', '11.3', 'Create PO', res113_retry, 201);
    }

    // --- Module 13: Putaway ---
    console.log('\n--- Module 13: Putaway ---');
    logTest('M13', '13.1', 'List Putaway Tasks', await request('/inventory/putaway/tasks'), 200);

    console.log('\n✅ Regression tests finished.');
    // To be expanded with more modules...
}

runTests().catch(console.error);
