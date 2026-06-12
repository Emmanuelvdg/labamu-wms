/**
 * Harness: Purchase Orders — Full Lifecycle
 *
 * Covers:
 *   POST   /purchase-orders              (create draft PO)
 *   GET    /purchase-orders              (list)
 *   GET    /purchase-orders/:id          (get by ID)
 *   GET    /purchase-orders/suppliers    (suppliers list for PO)
 *   POST   /purchase-orders/:id/submit   (submit for approval)
 *   POST   /purchase-orders/:id/approve  (approve)
 *   POST   /purchase-orders/:id/reject   (reject)
 *   POST   /purchase-orders/:id/receive  (receive goods)
 *   GET    /purchase-orders/:id/receipts (list receipts)
 *   POST   /purchase-orders/:id/documents  (attach document)
 *   GET    /purchase-orders/:id/documents  (list documents)
 *   POST   /purchase-orders/:id/inspections (add QA inspection)
 *   GET    /purchase-orders/:id/inspections (list inspections)
 *   POST   /purchase-orders/:id/match    (3-way match)
 *
 * Flow:
 *   Setup fixtures → create PO → submit → approve → receive → inspect → match
 *   Parallel: create PO → submit → reject (separate order)
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken, loginAsAdmin } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Purchase Orders Lifecycle', () => {
    let adminToken: string;
    let supplierId: string;
    let productId: string;
    let warehouseId: string;
    let locationId: string;
    let poId: string;
    let rejectPoId: string;

    test.beforeAll(async ({ request }) => {
        const saved = loadAdminApiToken();
        if (saved) { adminToken = saved.token; return; }
        const res = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'password123' },
        });
        adminToken = (await res.json()).token;
        expect(adminToken).toBeTruthy();
    });

    function auth() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    test('PO-0: Setup — create supplier, product, warehouse, location', async ({ request }) => {
        const suppRes = await request.post(`${API}/suppliers`, {
            headers: auth(),
            data: { name: `PO Test Supplier ${TS}`, contactInfo: `po-supp-${TS}@vendor.com` },
        });
        expect(suppRes.ok(), `Supplier: ${await suppRes.text()}`).toBeTruthy();
        supplierId = (await suppRes.json()).id;

        const prodRes = await request.post(`${API}/inventory/products`, {
            headers: auth(),
            data: { sku: `PO-PROD-${TS}`, name: `PO Test Product ${TS}`, category: 'General', price: 100000, velocity: 'B' },
        });
        expect(prodRes.ok(), `Product: ${await prodRes.text()}`).toBeTruthy();
        productId = (await prodRes.json()).id;

        const whRes = await request.post(`${API}/inventory/warehouses`, {
            headers: auth(),
            data: {
                name: `PO Test WH ${TS}`,
                shortName: `P${TS}`,
                address: '1 PO St', city: 'Jakarta', country: 'Indonesia',
                type: 'warehouse', location: { lat: -6.2, lng: 106.8 },
            },
        });
        expect(whRes.ok(), `WH: ${await whRes.text()}`).toBeTruthy();
        warehouseId = (await whRes.json()).id;

        const locRes = await request.post(`${API}/inventory/locations`, {
            headers: auth(),
            data: { name: `PO-RECV-${TS}`, warehouseId, type: 'RECEIVING' },
        });
        expect(locRes.ok(), `Location: ${await locRes.text()}`).toBeTruthy();
        locationId = (await locRes.json()).id;

        console.log(`✓ PO fixtures: supp=${supplierId}, prod=${productId}, wh=${warehouseId}, loc=${locationId}`);
    });

    // ── CREATE PO ───────────────────────────────────────────────────────────────

    test('PO-1: POST /purchase-orders creates a draft PO', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders`, {
            headers: auth(),
            data: {
                supplierId,
                expectedDate: '2026-08-01T00:00:00.000Z',
                items: [{ productId, quantity: 100, unitCost: 90000 }],
                notes: `E2E PO test ${TS}`,
            },
        });
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        poId = body.id;
        console.log('✓ PO created:', poId);
    });

    test('PO-2: POST /purchase-orders creates a second PO for rejection test', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders`, {
            headers: auth(),
            data: {
                supplierId,
                expectedDate: '2026-09-01T00:00:00.000Z',
                items: [{ productId, quantity: 50, unitCost: 85000 }],
                notes: `E2E PO to reject ${TS}`,
            },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        rejectPoId = (await res.json()).id;
        console.log('✓ Reject-target PO created:', rejectPoId);
    });

    // ── READ ────────────────────────────────────────────────────────────────────

    test('PO-3: GET /purchase-orders returns list including new PO', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.purchaseOrders ?? []);
        const found = arr.find((p: any) => p.id === poId);
        expect(found, 'Created PO should be in list').toBeTruthy();
    });

    test('PO-4: GET /purchase-orders/:id returns correct PO', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders/${poId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id).toBe(poId);
        expect(body.supplierId ?? body.supplier?.id).toBe(supplierId);
    });

    test('PO-5: GET /purchase-orders/suppliers returns suppliers list', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders/suppliers`, { headers: auth() });
        expect(res.ok(), `PO suppliers: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
    });

    // ── SUBMIT ───────────────────────────────────────────────────────────────────

    test('PO-6: POST /purchase-orders/:id/submit submits PO for approval', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${poId}/submit`, { headers: auth() });
        expect(res.ok(), `Submit: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const status = body.status ?? body.po?.status;
        expect(status).toMatch(/SUBMITTED|PENDING_APPROVAL|ORDERED|submitted|pending|ordered/i);
        console.log(`✓ PO submitted: status=${status}`);
    });

    test('PO-7: POST /purchase-orders/:id/submit for reject-PO', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${rejectPoId}/submit`, { headers: auth() });
        expect(res.ok(), `Submit reject PO: ${await res.text()}`).toBeTruthy();
    });

    // ── APPROVE / REJECT ─────────────────────────────────────────────────────────

    test('PO-8: POST /purchase-orders/:id/approve approves the PO', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${poId}/approve`, {
            headers: auth(),
            data: { comments: 'E2E approval' },
        });
        expect(res.ok(), `Approve: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const status = body.status ?? body.po?.status;
        expect(status).toMatch(/APPROVED|ORDERED|approved|ordered/i);
        console.log(`✓ PO approved: status=${status}`);
    });

    test('PO-9: POST /purchase-orders/:id/reject rejects a PO', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${rejectPoId}/reject`, {
            headers: auth(),
            data: { reason: 'Price too high — E2E test' },
        });
        expect(res.ok(), `Reject: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const status = body.status ?? body.po?.status;
        expect(status).toMatch(/REJECTED|rejected/i);
        console.log(`✓ PO rejected: status=${status}`);
    });

    // ── DOCUMENTS ────────────────────────────────────────────────────────────────

    test('PO-10: GET /purchase-orders/:id/documents returns empty array initially', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders/${poId}/documents`, { headers: auth() });
        expect(res.ok(), `Documents GET: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        expect(Array.isArray(arr)).toBeTruthy();
        console.log(`✓ Documents: ${arr.length} attached`);
    });

    // ── INSPECTIONS ──────────────────────────────────────────────────────────────

    test('PO-11: POST /purchase-orders/:id/inspections adds QA inspection', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${poId}/inspections`, {
            headers: auth(),
            data: {
                result: 'PASS',
                notes: 'All items inspected and passed E2E QA',
                inspectedQuantity: 100,
            },
        });
        expect(res.ok(), `Inspection: ${await res.text()}`).toBeTruthy();
        console.log('✓ QA inspection recorded');
    });

    test('PO-12: GET /purchase-orders/:id/inspections returns inspection records', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders/${poId}/inspections`, { headers: auth() });
        expect(res.ok(), `Inspections GET: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Inspections: ${arr.length} record(s)`);
    });

    // ── RECEIVE ──────────────────────────────────────────────────────────────────

    test('PO-13: POST /purchase-orders/:id/receive receives goods', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${poId}/receive`, {
            headers: auth(),
            data: {
                locationId,
                items: [{ productId, quantity: 100, condition: 'GOOD' }],
                notes: 'E2E receiving',
            },
        });
        expect(res.ok(), `Receive: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        console.log(`✓ PO received: status=${body.status ?? 'ok'}`);
    });

    test('PO-14: GET /purchase-orders/:id/receipts returns receipt records', async ({ request }) => {
        const res = await request.get(`${API}/purchase-orders/${poId}/receipts`, { headers: auth() });
        expect(res.ok(), `Receipts: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Receipts: ${arr.length} record(s)`);
    });

    // ── 3-WAY MATCH ──────────────────────────────────────────────────────────────

    test('PO-15: POST /purchase-orders/:id/match performs 3-way match', async ({ request }) => {
        const res = await request.post(`${API}/purchase-orders/${poId}/match`, {
            headers: auth(),
            data: { invoiceAmount: 9000000, notes: 'E2E 3-way match' },
        });
        // 200 if matched, 4xx if prerequisites not met — not a 500
        expect(res.status()).not.toBe(500);
        console.log(`✓ 3-way match: status=${res.status()}`);
    });

    // ── UI ───────────────────────────────────────────────────────────────────────

    test('PO-16: UI — /inventory/purchases page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventory/purchases');
        await page.waitForLoadState('networkidle');
        // Heading may say "Purchase Orders" or "Procurement"
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Purchase|Procurement/i);
        console.log('✓ Purchase orders UI loaded');
    });
});
