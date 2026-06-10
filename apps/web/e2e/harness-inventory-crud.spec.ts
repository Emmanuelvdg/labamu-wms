/**
 * Harness: Inventory Products — Full CRUD + Batch + Barcode
 *
 * Covers:
 *   POST   /inventory/products         (create)
 *   POST   /inventory/products/bulk    (bulk create)
 *   GET    /inventory/products         (list)
 *   GET    /inventory/products/:id     (get by ID)
 *   GET    /inventory/products/:id/barcode  (barcode data)
 *   PUT    /inventory/products/:id     (full update)
 *   POST   /inventory/batch            (create batch/lot)
 *   GET    /inventory/batch/:productId (batches for product)
 *   GET    /inventory/batches          (all batches)
 *   GET    /inventory/batches/:id      (batch by ID)
 *   GET    /inventory                  (inventory summary)
 *   GET    /inventory/valuation        (inventory valuation)
 *
 * Error cases:
 *   - 409 on duplicate SKU
 *   - 400 on missing name
 *   - 404 on unknown product ID
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Inventory CRUD', () => {
    let adminToken: string;
    let productId: string;
    let batchId: string;

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

    // ── CREATE PRODUCT ──────────────────────────────────────────────────────────

    test('INV-1: POST /inventory/products creates product', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: auth(),
            data: {
                sku: `HARN-${TS}`,
                name: `Harness Product ${TS}`,
                category: 'Electronics',
                price: 250000,
                velocity: 'A',
                weight: 1.5,
                width: 10,
                height: 5,
                depth: 8,
                minShelfLifeDays: 365,
            },
        });
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        expect(body.sku).toBe(`HARN-${TS}`);
        productId = body.id;
        console.log('✓ Product created:', productId);
    });

    test('INV-2: POST /inventory/products duplicate SKU → 409', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: auth(),
            data: { sku: `HARN-${TS}`, name: 'Dup Product', category: 'Electronics', price: 1, velocity: 'C' },
        });
        expect([409, 422]).toContain(res.status());
    });

    test('INV-3: POST /inventory/products without name → 400', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: auth(),
            data: { sku: `NO-NAME-${TS}`, category: 'General', price: 1 },
        });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('INV-4: POST /inventory/products/bulk creates multiple products', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products/bulk`, {
            headers: auth(),
            data: {
                items: [
                    { sku: `BULK-A-${TS}`, name: `Bulk Prod A ${TS}`, category: 'General', price: 10, velocity: 'C' },
                    { sku: `BULK-B-${TS}`, name: `Bulk Prod B ${TS}`, category: 'General', price: 20, velocity: 'C' },
                ],
            },
        });
        expect(res.ok(), `Bulk products: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.created ?? body.data ?? []);
        expect(arr.length).toBeGreaterThanOrEqual(2);
        console.log(`✓ Bulk created: ${arr.length} products`);
    });

    // ── READ PRODUCT ────────────────────────────────────────────────────────────

    test('INV-5: GET /inventory/products returns list with new product', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.products ?? []);
        expect(arr.length).toBeGreaterThan(0);
        const found = arr.find((p: any) => p.id === productId);
        expect(found, 'Created product should be in list').toBeTruthy();
    });

    test('INV-6: GET /inventory/products/:id returns correct product', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products/${productId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id).toBe(productId);
        expect(body.sku).toBe(`HARN-${TS}`);
        expect(body.category).toBe('Electronics');
    });

    test('INV-7: GET /inventory/products/:id for non-existent ID → 404', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products/non-existent-id`, { headers: auth() });
        expect(res.status()).toBe(404);
    });

    test('INV-8: GET /inventory/products/:id/barcode returns barcode data', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products/${productId}/barcode`, { headers: auth() });
        expect(res.ok(), `Barcode: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        // Should contain some barcode/QR data
        expect(body).toBeTruthy();
        console.log('✓ Barcode endpoint returned data');
    });

    // ── UPDATE PRODUCT ──────────────────────────────────────────────────────────

    test('INV-9: PUT /inventory/products/:id updates product fields', async ({ request }) => {
        const res = await request.put(`${API}/inventory/products/${productId}`, {
            headers: auth(),
            data: {
                sku: `HARN-${TS}`,
                name: `Harness Product UPDATED ${TS}`,
                category: 'Electronics',
                price: 300000,
                velocity: 'B',
                weight: 2.0,
            },
        });
        expect(res.ok(), `PUT product: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.name).toContain('UPDATED');
        expect(body.price ?? body.averageCost).toBeTruthy();
    });

    // ── BATCH / LOT ─────────────────────────────────────────────────────────────

    test('INV-10: POST /inventory/batch creates a batch for the product', async ({ request }) => {
        const res = await request.post(`${API}/inventory/batch`, {
            headers: auth(),
            data: {
                productId,
                batchNumber: `BATCH-${TS}`,
                expiryDate: '2027-12-31',
                quantity: 50,
                costPerUnit: 250000,
            },
        });
        expect(res.ok(), `Create batch: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        batchId = body.id ?? body.batch?.id;
        console.log('✓ Batch created:', batchId);
    });

    test('INV-11: GET /inventory/batch/:productId returns batches for product', async ({ request }) => {
        const res = await request.get(`${API}/inventory/batch/${productId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Batches for product: ${arr.length}`);
    });

    test('INV-12: GET /inventory/batches returns all batches', async ({ request }) => {
        const res = await request.get(`${API}/inventory/batches`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
    });

    test('INV-13: GET /inventory/batches/:id returns batch by ID', async ({ request }) => {
        if (!batchId) { test.skip(); return; }
        const res = await request.get(`${API}/inventory/batches/${batchId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id ?? body.batch?.id).toBe(batchId);
    });

    test('INV-14: GET /inventory/batches/:id/barcode returns barcode data', async ({ request }) => {
        if (!batchId) { test.skip(); return; }
        const res = await request.get(`${API}/inventory/batches/${batchId}/barcode`, { headers: auth() });
        expect(res.ok(), `Batch barcode: ${await res.text()}`).toBeTruthy();
    });

    // ── SUMMARY / VALUATION ─────────────────────────────────────────────────────

    test('INV-15: GET /inventory returns inventory summary', async ({ request }) => {
        const res = await request.get(`${API}/inventory`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        // Should be array or object with data
        expect(body).toBeTruthy();
        console.log('✓ Inventory summary returned');
    });

    test('INV-16: GET /inventory/valuation returns valuation data', async ({ request }) => {
        const res = await request.get(`${API}/inventory/valuation`, { headers: auth() });
        expect(res.ok(), `Valuation: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body).toBeTruthy();
        console.log('✓ Inventory valuation returned');
    });

    test('INV-17: GET /inventory/transactions returns transaction history', async ({ request }) => {
        const res = await request.get(`${API}/inventory/transactions`, { headers: auth() });
        expect(res.ok(), `Transactions: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Transactions: ${arr.length} records`);
    });
});
