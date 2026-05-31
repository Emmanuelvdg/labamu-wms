/**
 * @planRef E2E_Test_Plan11.md §Phase13 — Scenarios 13.1–13.3 (Create Return, Receive Damaged, Receive Sellable)
 *
 * E2E Flow: RMA (Return Merchandise Authorization)
 *
 * Covers: PRD §6 (Returns), TC-RMA
 *   1. Create customer + warehouse + product
 *   2. Create sales order → reserve stock (→ RESERVED)
 *   3. POST /returns  with originalOrderId → return order created (REQUESTED)
 *   4. POST /returns/:id/receive → items received with condition (→ RECEIVED/COMPLETED)
 *   5. GET /returns/order/:orderId → verify return record
 *   6. UI: /returns page loads
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const API = 'http://127.0.0.1:3001';

test.describe.configure({ mode: 'serial' });

test.describe('E2E Flow: RMA — Return Merchandise Authorization', () => {
    const TS = Date.now();

    let adminUserId: string;
    let warehouseId: string;
    let customerId: string;
    let productId: string;
    let supplierId: string;
    let salesOrderId: string;
    let returnOrderId: string;

    function authHeaders() {
        return { 'Content-Type': 'application/json', 'x-user-id': adminUserId };
    }

    async function authPost(request: any, url: string, data?: any) {
        return request.post(url, { headers: authHeaders(), data });
    }

    async function authGet(request: any, url: string) {
        return request.get(url, { headers: authHeaders() });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    test('Setup: authenticate as admin', async ({ request }) => {
        const res = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'password123' },
        });
        const body = await res.json();
        adminUserId = body.user?.id ?? body.id;
        expect(adminUserId, 'Could not get admin user ID from login').toBeTruthy();
        console.log('✓ Admin:', adminUserId);
    });

    // ── Warehouse ─────────────────────────────────────────────────────────────

    test('Setup: create warehouse', async ({ request }) => {
        const res = await authPost(request, `${API}/inventory/warehouses`, {
            name: `RMA WH ${TS}`,
            shortName: `RMA${TS.toString().slice(-4)}`,
            address: '1 Return Ave', city: 'Jakarta', country: 'Indonesia',
            type: 'warehouse', location: { lat: -6.2, lng: 106.8 },
        });
        expect(res.ok(), `Warehouse: ${await res.text()}`).toBeTruthy();
        warehouseId = (await res.json()).id;
        console.log('✓ Warehouse:', warehouseId);
    });

    // ── Supplier ──────────────────────────────────────────────────────────────

    test('Setup: create supplier', async ({ request }) => {
        const res = await authPost(request, `${API}/suppliers`, {
            name: `RMA Supplier ${TS}`,
            contactInfo: `rma-supplier-${TS}@test.com`,
        });
        expect(res.ok(), `Supplier: ${await res.text()}`).toBeTruthy();
        supplierId = (await res.json()).id;
        console.log('✓ Supplier:', supplierId);
    });

    // ── Customer ──────────────────────────────────────────────────────────────

    test('Setup: create customer', async ({ request }) => {
        const res = await authPost(request, `${API}/customers`, {
            name: `RMA Customer ${TS}`,
            email: `rma-${TS}@test.com`,
        });
        expect(res.ok(), `Customer: ${await res.text()}`).toBeTruthy();
        customerId = (await res.json()).id;
        console.log('✓ Customer:', customerId);
    });

    // ── Product + stock ───────────────────────────────────────────────────────

    test('Setup: create product and receive stock via PO', async ({ request }) => {
        // Create product
        const pRes = await authPost(request, `${API}/inventory/products`, {
            sku: `RMA-${TS}`, name: `RMA Product ${TS}`, category: 'General', price: 150, velocity: 'B',
        });
        expect(pRes.ok(), `Product: ${await pRes.text()}`).toBeTruthy();
        productId = (await pRes.json()).id;

        // Create PO
        const poRes = await authPost(request, `${API}/purchase-orders`, {
            supplierId,
            orderDate: new Date().toISOString(),
            items: [{ productId, quantity: 50, unitCost: 100 }],
        });
        expect(poRes.ok(), `PO: ${await poRes.text()}`).toBeTruthy();
        const po = await poRes.json();

        // Approve PO
        const approveRes = await authPost(request, `${API}/purchase-orders/${po.id}/approve`, {
            userId: adminUserId,
        });
        expect(approveRes.ok(), `Approve PO: ${await approveRes.text()}`).toBeTruthy();

        // Find receiving location
        const locsRes = await authGet(request, `${API}/inventory/locations?warehouseId=${warehouseId}`);
        const locs = await locsRes.json();
        const arr = Array.isArray(locs) ? locs : (locs.data ?? locs.items ?? []);
        const receivingLoc = arr.find((l: any) =>
            l.type === 'INTERNAL' &&
            (l.name?.toLowerCase().includes('receiving') || l.name?.toLowerCase().includes('dock'))
        ) ?? arr[0];

        // Receive goods
        const recRes = await authPost(request, `${API}/purchase-orders/${po.id}/receive`, {
            locationId: receivingLoc?.id ?? null,
        });
        expect(recRes.ok(), `Receive PO: ${await recRes.text()}`).toBeTruthy();
        console.log(`✓ Product ${productId} stocked (50 units)`);
    });

    // ── Sales order → RESERVED ────────────────────────────────────────────────

    test('Step 1: Create sales order and reserve stock', async ({ request }) => {
        // Create order
        const orderRes = await authPost(request, `${API}/orders`, {
            customerId,
            warehouseId,
            type: 'SALES',
            priority: 'NORMAL',
            items: [{ productId, quantity: 5 }],
        });
        expect(orderRes.ok(), `Order: ${await orderRes.text()}`).toBeTruthy();
        const order = await orderRes.json();
        salesOrderId = order.id;
        console.log(`✓ Sales order ${salesOrderId} status: ${order.status}`);

        // Reserve stock if not already reserved
        if (order.status !== 'RESERVED') {
            const reserveRes = await authPost(request, `${API}/orders/${salesOrderId}/check-availability`);
            expect(reserveRes.ok(), `Reserve: ${await reserveRes.text()}`).toBeTruthy();
            const reserved = await reserveRes.json();
            expect(reserved.status).toBe('RESERVED');
            console.log(`✓ Order reserved: ${reserved.status}`);
        }
    });

    // ── Step 2: Create return request ─────────────────────────────────────────

    test('Step 2: POST /returns creates a REQUESTED return order', async ({ request }) => {
        const res = await request.post(`${API}/returns`, {
            data: {
                originalOrderId: salesOrderId,
                items: [{ productId, quantity: 2, returnReason: 'Defective unit' }],
            },
        });
        expect(res.ok(), `Return create: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        returnOrderId = body.id;
        expect(body.status).toBe('REQUESTED');
        expect(body.type).toBe('RETURN');
        console.log(`✓ Return order ${returnOrderId} created (status=${body.status})`);
    });

    // ── Step 3: Receive returned items ────────────────────────────────────────

    test('Step 3: POST /returns/:id/receive processes returned items', async ({ request }) => {
        const res = await request.post(`${API}/returns/${returnOrderId}/receive`, {
            data: {
                items: [{ productId, quantity: 2, condition: 'GOOD' }],
            },
        });
        expect(res.ok(), `Return receive: ${await res.text()}`).toBeTruthy();

        // The receive endpoint returns the received items, not the parent return order.
        // GET the return order separately to verify status advanced.
        const statusRes = await request.get(`${API}/returns/${returnOrderId}`);
        expect(statusRes.ok(), `Get return after receive: ${await statusRes.text()}`).toBeTruthy();
        const returnOrder = await statusRes.json();
        expect(['RECEIVED', 'COMPLETED', 'RESTOCKED']).toContain(returnOrder.status);
        console.log(`✓ Return received. Status: ${returnOrder.status}`);
    });

    // ── Step 4: Verify return is linked to original order ─────────────────────

    test('Step 4: GET /returns/order/:orderId returns the return record', async ({ request }) => {
        const res = await request.get(`${API}/returns/order/${salesOrderId}`);
        expect(res.ok(), `Get returns: ${await res.text()}`).toBeTruthy();
        const raw = await res.json();
        const returns: any[] = Array.isArray(raw) ? raw : [raw];
        const ourReturn = returns.find((r: any) => r.id === returnOrderId);
        expect(ourReturn, `Return ${returnOrderId} not found in order's returns`).toBeTruthy();
        console.log(`✓ Return found via /returns/order/${salesOrderId}`);
    });

    // ── UI Verification ───────────────────────────────────────────────────────

    test('Step 5: UI — /returns page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/returns');
        await page.waitForLoadState('networkidle');

        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
        console.log('✓ Returns page heading:', await heading.textContent());
    });
});
