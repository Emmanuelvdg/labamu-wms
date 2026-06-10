/**
 * Harness: Suppliers — Full CRUD + Related Endpoints
 *
 * Covers:
 *   POST   /suppliers              (create)
 *   POST   /suppliers/bulk         (bulk create)
 *   GET    /suppliers              (list)
 *   GET    /suppliers/:id          (get by ID)
 *   GET    /suppliers/:id/orders   (supplier's POs)
 *   PATCH  /suppliers/:id          (update)
 *   DELETE /suppliers/:id          (delete)
 *   GET    /suppliers/reports/price-history  (price history)
 *
 * Error cases:
 *   - 400 on missing name
 *   - 404 on unknown ID
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Suppliers CRUD', () => {
    let adminToken: string;
    let supplierId: string;

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

    // ── CREATE ──────────────────────────────────────────────────────────────────

    test('SUPP-1: POST /suppliers creates a new supplier', async ({ request }) => {
        const res = await request.post(`${API}/suppliers`, {
            headers: auth(),
            data: {
                name: `Harness Supplier ${TS}`,
                contactInfo: `supplier-${TS}@vendor.com`,
                phone: '+6281234567',
                address: '5 Vendor Road, Jakarta',
                leadTimeDays: 7,
            },
        });
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        expect(body.name).toBe(`Harness Supplier ${TS}`);
        supplierId = body.id;
        console.log('✓ Supplier created:', supplierId);
    });

    test('SUPP-2: POST /suppliers without name → 400', async ({ request }) => {
        const res = await request.post(`${API}/suppliers`, {
            headers: auth(),
            data: { contactInfo: 'no-name@vendor.com' },
        });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('SUPP-3: POST /suppliers/bulk creates multiple suppliers', async ({ request }) => {
        const res = await request.post(`${API}/suppliers/bulk`, {
            headers: auth(),
            data: [
                { name: `Bulk Supp A ${TS}`, contactInfo: `bulk-a-${TS}@vendor.com` },
                { name: `Bulk Supp B ${TS}`, contactInfo: `bulk-b-${TS}@vendor.com` },
            ],
        });
        expect(res.ok(), `Bulk: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.created ?? body.data ?? []);
        expect(arr.length).toBeGreaterThanOrEqual(2);
    });

    // ── READ ────────────────────────────────────────────────────────────────────

    test('SUPP-4: GET /suppliers returns list including new supplier', async ({ request }) => {
        const res = await request.get(`${API}/suppliers`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
        const found = arr.find((s: any) => s.id === supplierId);
        expect(found, 'Created supplier should appear in list').toBeTruthy();
    });

    test('SUPP-5: GET /suppliers/:id returns correct supplier', async ({ request }) => {
        const res = await request.get(`${API}/suppliers/${supplierId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id).toBe(supplierId);
        expect(body.name).toContain('Harness Supplier');
    });

    test('SUPP-6: GET /suppliers/:id for non-existent ID → 404', async ({ request }) => {
        const res = await request.get(`${API}/suppliers/non-existent-id-xyz`, { headers: auth() });
        expect(res.status()).toBe(404);
    });

    test('SUPP-7: GET /suppliers/:id/orders returns array (may be empty)', async ({ request }) => {
        const res = await request.get(`${API}/suppliers/${supplierId}/orders`, { headers: auth() });
        expect(res.ok(), `Orders: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        expect(Array.isArray(arr)).toBeTruthy();
        console.log(`✓ Supplier orders: ${arr.length} PO(s)`);
    });

    test('SUPP-8: GET /suppliers/reports/price-history returns data', async ({ request }) => {
        const res = await request.get(`${API}/suppliers/reports/price-history`, { headers: auth() });
        // May return empty array if no invoices, but must not 500
        expect(res.ok(), `Price history: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Price history records: ${arr.length}`);
    });

    // ── UPDATE ──────────────────────────────────────────────────────────────────

    test('SUPP-9: PATCH /suppliers/:id updates supplier details', async ({ request }) => {
        const res = await request.patch(`${API}/suppliers/${supplierId}`, {
            headers: auth(),
            data: {
                name: `Harness Supplier UPDATED ${TS}`,
                leadTimeDays: 14,
                phone: '+6299999999',
            },
        });
        expect(res.ok(), `Patch: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.name).toContain('UPDATED');
        expect(body.leadTimeDays ?? body.lead_time_days).toBe(14);
    });

    test('SUPP-10: PATCH /suppliers/:id for non-existent ID → 404', async ({ request }) => {
        const res = await request.patch(`${API}/suppliers/non-existent-xyz`, {
            headers: auth(),
            data: { name: 'Ghost' },
        });
        expect(res.status()).toBe(404);
    });

    // ── DELETE ──────────────────────────────────────────────────────────────────

    test('SUPP-11: DELETE /suppliers/:id removes supplier', async ({ request }) => {
        const createRes = await request.post(`${API}/suppliers`, {
            headers: auth(),
            data: { name: `Supp To Delete ${TS}` },
        });
        expect(createRes.ok()).toBeTruthy();
        const toDelete = (await createRes.json()).id;

        const delRes = await request.delete(`${API}/suppliers/${toDelete}`, { headers: auth() });
        expect(delRes.ok(), `Delete: ${await delRes.text()}`).toBeTruthy();

        const getRes = await request.get(`${API}/suppliers/${toDelete}`, { headers: auth() });
        expect(getRes.status()).toBe(404);
        console.log('✓ Supplier deleted, confirmed 404');
    });

    // ── Cleanup ─────────────────────────────────────────────────────────────────

    test.afterAll(async ({ request }) => {
        if (supplierId) {
            await request.delete(`${API}/suppliers/${supplierId}`, { headers: auth() }).catch(() => {});
        }
    });
});
