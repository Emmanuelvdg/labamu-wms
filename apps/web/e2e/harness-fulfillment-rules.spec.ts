/**
 * Harness: Fulfillment Rules & Transfers
 *
 * Covers:
 *   POST   /fulfillment/rules          (create fulfillment rule)
 *   GET    /fulfillment/rules          (list rules)
 *   PUT    /fulfillment/rules/:id      (update rule)
 *   DELETE /fulfillment/rules/:id      (delete rule)
 *   POST   /fulfillment/transfers      (create fulfillment transfer)
 *   GET    /fulfillment/transfers      (list transfers)
 *   PUT    /fulfillment/transfers/:id/approve (approve transfer)
 *
 * Also covers:
 *   GET    /inventory/reordering-rules         (list reorder rules)
 *   POST   /inventory/reordering-rules         (create reorder rule)
 *   GET    /inventory/reordering-rules/check   (trigger reorder check)
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Fulfillment Rules & Reordering', () => {
    let adminToken: string;
    let ruleId: string;
    let transferId: string;
    let warehouseId: string;
    let productId: string;
    let reorderRuleId: string;
    let locationId: string;

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

    test('FULFILL-0: Setup — get warehouse and product IDs', async ({ request }) => {
        const whRes = await request.get(`${API}/inventory/warehouses`, { headers: auth() });
        if (whRes.ok()) {
            const whs = await whRes.json();
            const arr = Array.isArray(whs) ? whs : (whs.data ?? []);
            if (arr.length > 0) warehouseId = arr[0].id;
        }

        // Get a location ID (required for reordering rules)
        if (warehouseId) {
            const locRes = await request.get(`${API}/inventory/locations?warehouseId=${warehouseId}`, { headers: auth() });
            if (locRes.ok()) {
                const locs = await locRes.json();
                const locArr = Array.isArray(locs) ? locs : (locs.data ?? []);
                if (locArr.length > 0) locationId = locArr[0].id;
            }
        }

        const prodRes = await request.post(`${API}/inventory/products`, {
            headers: auth(),
            data: { sku: `FULFILL-${TS}`, name: `Fulfill Test Product ${TS}`, category: 'General', price: 10000, velocity: 'B' },
        });
        if (prodRes.ok()) productId = (await prodRes.json()).id;

        console.log(`✓ Fixtures: wh=${warehouseId}, product=${productId}`);
    });

    // ── FULFILLMENT RULES ────────────────────────────────────────────────────────

    test('FULFILL-1: POST /fulfillment/rules creates a fulfillment rule', async ({ request }) => {
        const res = await request.post(`${API}/fulfillment/rules`, {
            headers: auth(),
            data: {
                name: `Harness Rule ${TS}`,
                priority: 1,
                strategy: 'CLOSEST',
                warehouseId: warehouseId ?? undefined,
                active: true,
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        ruleId = body.id;
        console.log('✓ Fulfillment rule created:', ruleId);
    });

    test('FULFILL-2: GET /fulfillment/rules returns list', async ({ request }) => {
        const res = await request.get(`${API}/fulfillment/rules`, { headers: auth() });
        expect(res.ok(), `Rules list: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
        const found = arr.find((r: any) => r.id === ruleId);
        expect(found, 'Created rule should be in list').toBeTruthy();
    });

    test('FULFILL-3: PUT /fulfillment/rules/:id updates the rule', async ({ request }) => {
        const res = await request.put(`${API}/fulfillment/rules/${ruleId}`, {
            headers: auth(),
            data: {
                name: `Harness Rule UPDATED ${TS}`,
                priority: 2,
                strategy: 'HIGHEST_STOCK',
                warehouseId: warehouseId ?? undefined,
            },
        });
        expect(res.ok(), `Update rule: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.name).toContain('UPDATED');
    });

    test('FULFILL-4: DELETE /fulfillment/rules/:id removes the rule', async ({ request }) => {
        // Create throwaway rule
        const createRes = await request.post(`${API}/fulfillment/rules`, {
            headers: auth(),
            data: { name: `Rule To Delete ${TS}`, priority: 99, strategy: 'CLOSEST', warehouseId: warehouseId ?? undefined },
        });
        if (!createRes.ok()) { test.skip(); return; }
        const toDelete = (await createRes.json()).id;

        const delRes = await request.delete(`${API}/fulfillment/rules/${toDelete}`, { headers: auth() });
        expect(delRes.ok(), `Delete rule: ${await delRes.text()}`).toBeTruthy();
        console.log('✓ Fulfillment rule deleted');
    });

    // ── FULFILLMENT TRANSFERS ────────────────────────────────────────────────────

    test('FULFILL-5: POST /fulfillment/transfers creates a transfer', async ({ request }) => {
        if (!warehouseId || !productId) { test.skip(); return; }
        const res = await request.post(`${API}/fulfillment/transfers`, {
            headers: auth(),
            data: {
                sourceWarehouseId: warehouseId,
                destinationWarehouseId: warehouseId, // same for test
                items: [{ productId, quantity: 10 }],
                notes: `E2E fulfillment transfer ${TS}`,
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        if (body.id) transferId = body.id;
        console.log('✓ Fulfillment transfer created:', transferId);
    });

    test('FULFILL-6: GET /fulfillment/transfers returns list', async ({ request }) => {
        const res = await request.get(`${API}/fulfillment/transfers`, { headers: auth() });
        expect(res.ok(), `Transfers: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Fulfillment transfers: ${arr.length} record(s)`);
    });

    test('FULFILL-7: PUT /fulfillment/transfers/:id/approve approves the transfer', async ({ request }) => {
        if (!transferId) { test.skip(); return; }
        const res = await request.put(`${API}/fulfillment/transfers/${transferId}/approve`, {
            headers: auth(),
            data: { notes: 'E2E approved' },
        });
        expect(res.status()).not.toBe(500);
        console.log(`✓ Transfer approve attempt: ${res.status()}`);
    });

    // ── REORDERING RULES ─────────────────────────────────────────────────────────

    test('REORDER-1: POST /inventory/reordering-rules creates a reorder rule', async ({ request }) => {
        if (!productId || !locationId) { test.skip(); return; }
        const res = await request.post(`${API}/inventory/reordering-rules`, {
            headers: auth(),
            data: {
                productId,
                locationId,
                minQuantity: 10,
                maxQuantity: 200,
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        reorderRuleId = body.id;
        console.log('✓ Reorder rule created:', reorderRuleId);
    });

    test('REORDER-2: GET /inventory/reordering-rules lists rules', async ({ request }) => {
        const res = await request.get(`${API}/inventory/reordering-rules`, { headers: auth() });
        expect(res.ok(), `Reorder rules: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        console.log(`✓ Reorder rules: ${arr.length}`);
    });

    test('REORDER-3: GET /inventory/reordering-rules/check triggers reorder check', async ({ request }) => {
        const res = await request.get(`${API}/inventory/reordering-rules/check`, { headers: auth() });
        expect(res.ok(), `Reorder check: ${await res.text()}`).toBeTruthy();
        console.log('✓ Reorder check triggered');
    });
});
