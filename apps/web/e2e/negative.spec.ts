/**
 * Negative / Edge-Case Tests
 *
 * @planRef E2E_Test_Plan11.md — cross-cutting validation scenarios
 *   NEG-1: Wrong-password authentication → 401
 *   NEG-2: Unauthenticated API access → 401
 *   NEG-3: Duplicate product SKU → 409
 *   NEG-4: Duplicate warehouse short-name → 409
 *   NEG-5: Missing required field on product creation → 400
 *   NEG-6: Cancel an already-cancelled order → 4xx
 *
 * All tests use the `request` fixture (API-first) — no UI required.
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';
const TS = Date.now().toString().slice(-8);

test.describe('Negative & Edge-Case Validation', () => {
    let adminId: string;

    test.beforeAll(async ({ request }) => {
        const res = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'admin' },
        });
        const body = await res.json();
        adminId = body.user?.id ?? body.id;
        expect(adminId, 'Could not resolve admin ID for negative tests').toBeTruthy();
    });

    function authHeaders() {
        return { 'Content-Type': 'application/json', 'x-user-id': adminId };
    }

    // ── NEG-1: Wrong password ─────────────────────────────────────────────────

    test('NEG-1: POST /auth/login with wrong password → 401', async ({ request }) => {
        const res = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'definitely-wrong-password' },
        });
        expect(res.status()).toBe(401);
        const body = await res.json();
        const message = (body.message ?? body.userMessage ?? '').toLowerCase();
        expect(message).toMatch(/invalid|incorrect|wrong|credentials|password/i);
    });

    // ── NEG-2: Unauthenticated API access ────────────────────────────────────

    test('NEG-2: GET /inventory/products without auth header → 401', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products`, {
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.status()).toBe(401);
    });

    test('NEG-2b: GET /orders without auth header → 401', async ({ request }) => {
        const res = await request.get(`${API}/orders`, {
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.status()).toBe(401);
    });

    // ── NEG-3: Duplicate product SKU ─────────────────────────────────────────

    test('NEG-3: POST /inventory/products with duplicate SKU → 409', async ({ request }) => {
        const sku = `NEG-SKU-${TS}`;
        const payload = {
            sku,
            name: `Negative Test Product ${TS}`,
            category: 'General',
            price: 10,
            velocity: 'C',
        };

        const first = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(),
            data: payload,
        });
        expect(first.status(), `First create should succeed: ${await first.text()}`).toBe(201);

        const second = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(),
            data: payload,
        });
        // Expect conflict (409) or unprocessable (422); must NOT be 2xx
        expect([409, 422]).toContain(second.status());
        const body = await second.json();
        const errorText = JSON.stringify(body).toLowerCase();
        expect(errorText).toMatch(/duplicate|unique|conflict|already exist/i);
    });

    // ── NEG-4: Duplicate warehouse short-name ────────────────────────────────

    test('NEG-4: POST /inventory/warehouses with duplicate shortName → 409', async ({ request }) => {
        const shortName = `NG${TS.slice(-4)}`;
        const payload = {
            name: `Negative WH ${TS}`,
            shortName,
            address: '1 Neg St',
            city: 'Jakarta',
            country: 'Indonesia',
            type: 'warehouse',
            location: { lat: -6.2, lng: 106.8 },
        };

        const first = await request.post(`${API}/inventory/warehouses`, {
            headers: authHeaders(),
            data: payload,
        });
        expect(first.status(), `First warehouse create should succeed: ${await first.text()}`).toBe(201);

        const second = await request.post(`${API}/inventory/warehouses`, {
            headers: authHeaders(),
            data: { ...payload, name: `Negative WH Dup ${TS}` }, // same shortName, different name
        });
        expect([409, 422]).toContain(second.status());
        const body = await second.json();
        const errorText = JSON.stringify(body).toLowerCase();
        expect(errorText).toMatch(/duplicate|unique|conflict|already exist/i);
    });

    // ── NEG-5: Missing required field ────────────────────────────────────────

    test('NEG-5: POST /inventory/products without required name → 400', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(),
            data: {
                sku: `NEG-NONAME-${TS}`,
                // name intentionally omitted
                category: 'General',
                price: 10,
            },
        });
        expect(res.status()).toBe(400);
    });

    // ── NEG-6: Cancel an already-cancelled order ─────────────────────────────

    test('NEG-6: Cancel an already-cancelled order → 4xx', async ({ request }) => {
        // Create minimal fixtures to get a cancellable order
        const supplierRes = await request.post(`${API}/suppliers`, {
            headers: authHeaders(),
            data: { name: `Neg Supplier ${TS}`, contactInfo: `neg-${TS}@test.com` },
        });
        if (!supplierRes.ok()) {
            test.skip(); return;
        }
        const supplierId = (await supplierRes.json()).id;

        const productRes = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(),
            data: { sku: `NEG-ORD-${TS}`, name: `Neg Order Product ${TS}`, category: 'General', price: 5, velocity: 'C' },
        });
        if (!productRes.ok()) { test.skip(); return; }
        const productId = (await productRes.json()).id;

        const customerRes = await request.post(`${API}/customers`, {
            headers: authHeaders(),
            data: { name: `Neg Customer ${TS}` },
        });
        if (!customerRes.ok()) { test.skip(); return; }
        const customerId = (await customerRes.json()).id;

        const orderRes = await request.post(`${API}/orders`, {
            headers: authHeaders(),
            data: {
                customerId,
                items: [{ productId, quantity: 1, unitPrice: 5 }],
            },
        });
        if (!orderRes.ok()) { test.skip(); return; }
        const orderId = (await orderRes.json()).id;

        // Cancel once (should succeed)
        const cancel1 = await request.post(`${API}/orders/${orderId}/cancel`, {
            headers: authHeaders(),
        });
        expect(cancel1.ok(), `First cancel should succeed: ${await cancel1.text()}`).toBeTruthy();

        // Cancel again (must reject)
        const cancel2 = await request.post(`${API}/orders/${orderId}/cancel`, {
            headers: authHeaders(),
        });
        expect(cancel2.status()).toBeGreaterThanOrEqual(400);
        expect(cancel2.status()).toBeLessThan(500);
    });
});
