import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Comprehensive E2E Workflow Test
 * Covers the full IMS lifecycle using API-first approach:
 *   Purchase → Receive → Putaway → Sales → Pick → Pack → Ship → Validate
 *
 * Uses Playwright's `request` fixture for reliability.
 * Authenticates via POST /auth/login and passes Authorization: Bearer <token> on permission-guarded endpoints.
 *
 * Auth-required controllers: inventory, purchase-orders, orders, suppliers, customers
 * Open controllers (no guard): putaway, strategy, packing, shipping
 */

const API = 'http://127.0.0.1:3001';

test.describe.configure({ mode: 'serial' });

test.describe('Full IMS Lifecycle: Purchase to Ship', () => {
    // Shared state across serial tests
    let adminUserId: string;
    let adminToken: string;
    let warehouseId: string;
    let receivingLocationId: string;
    let storageLocationId: string;
    let productId: string;
    let supplierId: string;
    let customerId: string;
    let purchaseOrderId: string;
    let orderId: string;
    let pickingSessionId: string;
    let packingSessionId: string;

    const TIMESTAMP = Date.now();
    const WAREHOUSE_NAME = `Workflow WH ${TIMESTAMP}`;
    const PRODUCT_SKU = `WF-LAP-${TIMESTAMP}`;
    const PRODUCT_NAME = `Pro Laptop X ${TIMESTAMP}`;
    const SUPPLIER_NAME = `PT TechSupplier ${TIMESTAMP}`;
    const CUSTOMER_NAME = `CV Gadget Store ${TIMESTAMP}`;

    /** Convenience: returns headers with admin auth */
    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
        };
    }

    /** POST helper with auth */
    async function authPost(request: APIRequestContext, url: string, data?: any) {
        return request.post(url, { headers: authHeaders(), data });
    }

    /** GET helper with auth */
    async function authGet(request: APIRequestContext, url: string) {
        return request.get(url, { headers: authHeaders() });
    }

    // ==================== AUTH ====================

    test('Auth: Discover Admin User', async ({ request }) => {
        const loginRes = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'password123' },
        });
        const body = await loginRes.json();
        adminUserId = body.user?.id ?? body.id;
        adminToken = body.token;
        expect(adminUserId, 'Could not get admin user ID from login').toBeTruthy();
        console.log('✓ Logged in as admin:', adminUserId);
    });

    // ==================== DATA SETUP (API) ====================

    test('Setup: Create Warehouse', async ({ request }) => {
        const res = await authPost(request, `${API}/inventory/warehouses`, {
            name: WAREHOUSE_NAME,
            shortName: `WF${TIMESTAMP.toString().slice(-4)}`,
            address: '100 Workflow Ave',
            city: 'Jakarta',
            country: 'Indonesia',
            type: 'warehouse',
            location: { lat: -6.2, lng: 106.8 },
        });
        expect(res.ok(), `Warehouse creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        warehouseId = body.id;
        console.log('✓ Warehouse:', warehouseId);
    });

    test('Setup: Find Receiving Location', async ({ request }) => {
        // Warehouse creation auto-creates a "Receiving Dock" functional area location.
        // Use THAT location so receiveGoods and createSession agree on which location
        // holds the receipt (they both use the functional-area-linked location).
        const res = await authGet(request, `${API}/inventory/locations?warehouseId=${warehouseId}`);
        expect(res.ok(), `Locations fetch failed: ${await res.text()}`).toBeTruthy();
        const locations = await res.json();
        const arr = Array.isArray(locations) ? locations : (locations.data || locations.items || []);
        const receivingLoc = arr.find((l: any) =>
            l.type === 'INTERNAL' &&
            (l.name?.toLowerCase().includes('receiving') || l.name?.toLowerCase().includes('dock'))
        );
        if (receivingLoc) {
            receivingLocationId = receivingLoc.id;
            console.log('✓ Found existing Receiving Location:', receivingLocationId, '–', receivingLoc.name);
        } else {
            // Fallback: create one
            const createRes = await authPost(request, `${API}/inventory/locations`, {
                name: `Receiving Dock ${TIMESTAMP}`,
                warehouseId,
                type: 'INTERNAL',
                maxWeight: 10000,
                maxVolume: 500,
            });
            expect(createRes.ok(), `Location creation failed: ${await createRes.text()}`).toBeTruthy();
            const body = await createRes.json();
            receivingLocationId = body.id;
            console.log('✓ Created Receiving Location:', receivingLocationId);
        }
    });

    test('Setup: Create Storage Location', async ({ request }) => {
        const res = await authPost(request, `${API}/inventory/locations`, {
            name: `STG-A1-${TIMESTAMP}`,
            warehouseId,
            type: 'INTERNAL',
            barcode: `STG-A1-${TIMESTAMP}`,
            zonePriority: 10,
            putawaySequence: 1,
            maxWeight: 5000,
            maxVolume: 200,
        });
        expect(res.ok(), `Location creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        storageLocationId = body.id;
        console.log('✓ Storage Location:', storageLocationId);
    });

    test('Setup: Create Product', async ({ request }) => {
        const res = await authPost(request, `${API}/inventory/products`, {
            sku: PRODUCT_SKU,
            name: PRODUCT_NAME,
            category: 'Electronics',
            price: 1500,
            velocity: 'A',
            weight: 2,
            width: 40,
            height: 30,
            depth: 5,
        });
        expect(res.ok(), `Product creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        productId = body.id;
        console.log('✓ Product:', productId);
    });

    test('Setup: Create Supplier', async ({ request }) => {
        const res = await authPost(request, `${API}/suppliers`, {
            name: SUPPLIER_NAME,
            contactInfo: 'tech@supplier.com',
        });
        expect(res.ok(), `Supplier creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        supplierId = body.id;
        console.log('✓ Supplier:', supplierId);
    });

    test('Setup: Create Customer', async ({ request }) => {
        const res = await authPost(request, `${API}/customers`, {
            name: CUSTOMER_NAME,
            email: `cv-gadget-${TIMESTAMP}@test.com`,
        });
        expect(res.ok(), `Customer creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        customerId = body.id;
        console.log('✓ Customer:', customerId);
    });

    // ==================== STEP 1: PURCHASING ====================

    test('Step 1: Create Purchase Order', async ({ request }) => {
        const res = await authPost(request, `${API}/purchase-orders`, {
            supplierId,
            orderDate: new Date().toISOString(),
            items: [
                {
                    productId,
                    quantity: 20,
                    unitCost: 1500,
                },
            ],
        });
        expect(res.ok(), `PO creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        purchaseOrderId = body.id;
        expect(body.status).toBe('ORDERED');
        console.log('✓ PO created:', purchaseOrderId, 'Status:', body.status);
    });

    // ==================== STEP 1.5: APPROVE PO ====================

    test('Step 1.5: Approve Purchase Order', async ({ request }) => {
        // PO must be APPROVED before it can be RECEIVED
        const res = await authPost(request, `${API}/purchase-orders/${purchaseOrderId}/approve`, {
            userId: adminUserId,
        });
        expect(res.ok(), `PO approval failed: ${await res.text()}`).toBeTruthy();
        console.log('✓ PO approved');
    });

    // ==================== STEP 2: RECEIVING ====================

    test('Step 2: Receive Purchase Order', async ({ request }) => {
        // Receive all items at the receiving location (empty items array = receive all remaining)
        const res = await authPost(request, `${API}/purchase-orders/${purchaseOrderId}/receive`, {
            locationId: receivingLocationId,
        });
        expect(res.ok(), `PO receive failed: ${await res.text()}`).toBeTruthy();

        // Verify the PO status is now RECEIVED
        const poRes = await authGet(request, `${API}/purchase-orders/${purchaseOrderId}`);
        const po = await poRes.json();
        expect(po.status).toBe('RECEIVED');
        console.log('✓ PO received. Status:', po.status);
    });

    // ==================== STEP 3: PUTAWAY ====================

    test('Step 3: Putaway - Complete Tasks', async ({ request }) => {
        // receiveGoods emits receipt.completed which runs routing rules but does NOT
        // auto-create a putaway session. We must POST to create one explicitly.
        const createSessionRes = await request.post(`${API}/inventory/putaway/sessions`, {
            data: { warehouseId },
        });
        expect(createSessionRes.ok(), `Create putaway session failed: ${await createSessionRes.text()}`).toBeTruthy();
        const session = await createSessionRes.json();
        console.log('✓ Putaway session created:', session.id);

        // 3b. Find tasks for our product
        const tasks = session.tasks || [];
        expect(tasks.length).toBeGreaterThan(0);
        console.log(`  Found ${tasks.length} putaway task(s)`);

        // 3c. Start and complete each task
        for (const task of tasks) {
            // Start the task (IN_PROGRESS)
            const startRes = await request.patch(`${API}/inventory/putaway/tasks/${task.id}`, {
                data: { status: 'IN_PROGRESS' },
            });
            expect(startRes.ok()).toBeTruthy();

            // Complete the task (COMPLETED) — move to storage location
            const completeRes = await request.patch(`${API}/inventory/putaway/tasks/${task.id}`, {
                data: {
                    status: 'COMPLETED',
                    alternativeLocationId: storageLocationId,
                },
            });
            expect(completeRes.ok()).toBeTruthy();
            console.log(`  ✓ Task ${task.id} completed → storage`);
        }

        // 3d. Complete the session
        const completeSessionRes = await request.patch(
            `${API}/inventory/putaway/sessions/${session.id}/complete`
        );
        expect(completeSessionRes.ok()).toBeTruthy();
        console.log('✓ Putaway session completed');
    });

    // ==================== STEP 4: SALES ORDER ====================

    test('Step 4: Create Sales Order', async ({ request }) => {
        // Get a delivery method (shipping controller is unguarded)
        const methodsRes = await request.get(`${API}/shipping/methods`);
        let deliveryMethodId: string | undefined;
        if (methodsRes.ok()) {
            const methods = await methodsRes.json();
            deliveryMethodId = methods.length > 0 ? methods[0].id : undefined;
        }

        const res = await authPost(request, `${API}/orders`, {
            customerId,
            priority: 'MEDIUM',
            warehouseId,
            type: 'SALES',
            deliveryMethodId,
            items: [
                {
                    productId,
                    quantity: 15,
                },
            ],
        });
        expect(res.ok(), `Order creation failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        orderId = body.id;
        console.log('✓ Sales Order created:', orderId, 'Status:', body.status);
    });

    // ==================== STEP 5: CHECK AVAILABILITY ====================

    test('Step 5: Check Availability (Reserve Stock)', async ({ request }) => {
        const res = await authPost(request, `${API}/orders/${orderId}/check-availability`);
        expect(res.ok(), `Check availability failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.status).toBe('RESERVED');
        console.log('✓ Order reserved. Status:', body.status);
    });

    // ==================== STEP 6: PICKING ====================

    test('Step 6: Pick Order', async ({ request }) => {
        // 6a. Create picking session (strategy controller is unguarded)
        const sessionRes = await request.post(`${API}/strategy/picking/sessions`, {
            data: {
                warehouseId,
                strategy: 'SINGLE',
            },
        });
        expect(sessionRes.ok(), `Picking session failed: ${await sessionRes.text()}`).toBeTruthy();
        const session = await sessionRes.json();
        pickingSessionId = session.id;
        console.log('✓ Picking session created:', pickingSessionId);

        // 6b. Complete each picking task
        const tasks = session.tasks || [];
        expect(tasks.length).toBeGreaterThan(0);
        console.log(`  Found ${tasks.length} picking task(s)`);

        for (const task of tasks) {
            const updateRes = await request.patch(`${API}/strategy/picking/tasks/${task.id}`, {
                data: {
                    pickedQuantity: task.quantity,
                    status: 'PICKED',
                },
            });
            expect(updateRes.ok()).toBeTruthy();
            console.log(`  ✓ Picked task ${task.id}: ${task.quantity} units`);
        }

        // 6c. Complete the session
        const completeRes = await request.post(
            `${API}/strategy/picking/sessions/${pickingSessionId}/complete`
        );
        expect(completeRes.ok()).toBeTruthy();
        console.log('✓ Picking session completed');

        // 6d. Verify order status moved to PACKING
        const orderRes = await authGet(request, `${API}/orders/${orderId}`);
        const order = await orderRes.json();
        expect(order.status).toBe('PACKING');
        console.log('✓ Order status:', order.status);
    });

    // ==================== STEP 7: PACKING ====================

    test('Step 7: Pack Order', async ({ request }) => {
        // 7a. Create packing session (packing controller is unguarded)
        const sessionRes = await request.post(`${API}/packing/sessions`, {
            data: { orderId },
        });
        expect(sessionRes.ok(), `Packing session failed: ${await sessionRes.text()}`).toBeTruthy();
        const session = await sessionRes.json();
        packingSessionId = session.id;
        console.log('✓ Packing session created:', packingSessionId);

        // 7b. Create a parcel with all items
        const parcelRes = await request.post(`${API}/packing/sessions/${packingSessionId}/parcels`, {
            data: {
                weight: 30,
                length: 50,
                width: 40,
                height: 20,
                items: [
                    {
                        productId,
                        quantity: 15,
                    },
                ],
            },
        });
        expect(parcelRes.ok(), `Parcel creation failed: ${await parcelRes.text()}`).toBeTruthy();
        console.log('✓ Parcel created');

        // 7c. Complete packing session
        const completeRes = await request.post(
            `${API}/packing/sessions/${packingSessionId}/complete`
        );
        expect(completeRes.ok(), `Packing complete failed: ${await completeRes.text()}`).toBeTruthy();
        console.log('✓ Packing session completed');

        // 7d. Verify order status is PACKED
        const orderRes = await authGet(request, `${API}/orders/${orderId}`);
        const order = await orderRes.json();
        expect(order.status).toBe('PACKED');
        console.log('✓ Order status:', order.status);
    });

    // ==================== STEP 8: SHIPPING ====================

    test('Step 8: Ship Order', async ({ request }) => {
        const res = await authPost(request, `${API}/orders/ship`, {
            orderId,
            carrier: 'Express Logistics',
            trackingId: `TRACK-${TIMESTAMP}`,
        });
        expect(res.ok(), `Shipping failed: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.status).toBe('SHIPPED');
        console.log('✓ Shipment created. Status:', body.status);
    });

    // ==================== STEP 9: VALIDATION ====================

    test('Step 9: Validate Final State', async ({ request }) => {
        // 9a. Verify order is SHIPPED
        const orderRes = await authGet(request, `${API}/orders/${orderId}`);
        expect(orderRes.ok()).toBeTruthy();
        const order = await orderRes.json();
        expect(order.status).toBe('SHIPPED');
        console.log('✓ Final order status: SHIPPED');

        // 9b. Verify PO is RECEIVED
        const poRes = await authGet(request, `${API}/purchase-orders/${purchaseOrderId}`);
        expect(poRes.ok()).toBeTruthy();
        const po = await poRes.json();
        expect(po.status).toBe('RECEIVED');
        console.log('✓ PO status: RECEIVED');

        // 9c. Check shipment has tracking ID
        expect(order.shipment).toBeTruthy();
        expect(order.shipment.trackingId).toBe(`TRACK-${TIMESTAMP}`);
        console.log('✓ Shipment tracking verified:', order.shipment.trackingId);

        // 9d. Log summary
        console.log('\n========== WORKFLOW SUMMARY ==========');
        console.log(`  Warehouse:  ${WAREHOUSE_NAME}`);
        console.log(`  Product:    ${PRODUCT_NAME} (${PRODUCT_SKU})`);
        console.log(`  Purchased:  20 units from ${SUPPLIER_NAME}`);
        console.log(`  Sold:       15 units to ${CUSTOMER_NAME}`);
        console.log(`  PO Status:  ${po.status}`);
        console.log(`  SO Status:  ${order.status}`);
        console.log(`  Tracking:   ${order.shipment.trackingId}`);
        console.log('======================================\n');
    });

    // ==================== STEP 10: UI VERIFICATION ====================

    test('Step 10: UI Verification - Dashboard & Orders', async ({ page }) => {
        await loginAsAdmin(page);

        // Verify Dashboard loads — use first() since 'text=Dashboard' may match nav link + loading text
        await page.goto('/');
        await expect(page.locator('text=Stock Value').or(page.locator('text=Dashboard')).first()).toBeVisible({ timeout: 10000 });
        console.log('✓ Dashboard loads successfully');

        // Verify inventory page loads
        await page.goto('/inventory');
        await page.waitForLoadState('networkidle');
        const inventoryTable = page.locator('table');
        await expect(inventoryTable).toBeVisible({ timeout: 10000 });
        console.log('✓ Inventory page loads with table');

        // Verify order is visible in orders page
        await page.goto('/orders');
        await page.waitForLoadState('networkidle');
        const ordersTable = page.locator('table');
        await expect(ordersTable).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('SHIPPED').first()).toBeVisible({ timeout: 10000 });
        console.log('✓ SHIPPED order visible in Orders page');
    });
});
