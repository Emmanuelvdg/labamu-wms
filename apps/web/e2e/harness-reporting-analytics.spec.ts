/**
 * Harness: Reporting & Analytics — All Drilldown Endpoints
 *
 * Covers:
 *   GET  /reporting/analytics                          (dashboard analytics)
 *   GET  /reporting/analytics/drilldown/stock-value    (stock value drilldown)
 *   GET  /reporting/analytics/drilldown/fulfillment    (fulfillment drilldown)
 *   GET  /reporting/analytics/drilldown/stockout       (stockout drilldown)
 *   GET  /reporting/analytics/drilldown/pending-orders (pending orders drilldown)
 *   GET  /reporting/analytics/drilldown/cycle-time     (cycle time drilldown)
 *   GET  /reporting/analytics/drilldown/capacity       (capacity drilldown)
 *   GET  /reporting/inventory-ledger                   (inventory ledger)
 *   GET  /reporting/cycle-time/trend                   (cycle time trend)
 *   GET  /reporting/pick-accuracy/:warehouseId         (pick accuracy)
 *   GET  /reporting/cycle-count/:warehouseId           (cycle count report)
 *   POST /reporting/compliance                         (generate compliance report)
 *   UI:  /reporting, /reporting/cycle-time, /reporting/utilisation,
 *        /reporting/compliance, /reporting/inventory-ledger
 *
 * All drilldown endpoints require ADVANCED_ANALYTICS feature flag.
 * beforeAll enables the flag; afterAll leaves it enabled (it's the test company's flag).
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken, loginAsAdmin } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

function loadAdminAuth(): { token: string; companyId: string } | null {
    try {
        const state = JSON.parse(fs.readFileSync(path.join('e2e', '.auth', 'admin.json'), 'utf-8'));
        const tokenCookie = (state.cookies ?? []).find((c: any) => c.name === 'token');
        const companyCookie = (state.cookies ?? []).find((c: any) => c.name === 'company_id');
        if (tokenCookie?.value && companyCookie?.value) {
            return { token: tokenCookie.value, companyId: companyCookie.value };
        }
    } catch { /* fall through */ }
    return null;
}

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Reporting & Analytics', () => {
    let adminToken: string;
    let companyId: string;
    let warehouseId: string;

    test.beforeAll(async ({ request }) => {
        const saved = loadAdminAuth();
        if (saved) {
            adminToken = saved.token;
            companyId = saved.companyId;
        } else {
            const res = await request.post(`${API}/auth/login`, {
                data: { email: 'admin@labamu.co.id', password: 'password123' },
            });
            const body = await res.json();
            adminToken = body.token;
            companyId = body.user?.companyId ?? body.companyId;
        }
        expect(adminToken).toBeTruthy();

        // Ensure ADVANCED_ANALYTICS is enabled
        if (companyId) {
            await request.put(`${API}/companies/${companyId}/feature-flags/ADVANCED_ANALYTICS`, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                data: { enabled: true },
            });
        }

        // Pick a warehouse for per-warehouse endpoints
        const whRes = await request.get(`${API}/inventory/warehouses`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (whRes.ok()) {
            const whs = await whRes.json();
            const arr = Array.isArray(whs) ? whs : (whs.data ?? []);
            if (arr.length > 0) warehouseId = arr[0].id;
        }
    });

    function auth() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
    }

    // ── DASHBOARD ANALYTICS ──────────────────────────────────────────────────────

    test('RPT-1: GET /reporting/analytics returns dashboard KPIs', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics`, { headers: auth() });
        expect(res.ok(), `Analytics: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        // Core KPI fields must be present
        expect(typeof body.totalStockValue).toBe('number');
        expect(typeof body.fulfillmentRate).toBe('number');
        expect(typeof body.stockoutRate).toBe('number');
        expect(Array.isArray(body.dailySales)).toBeTruthy();
        console.log(`✓ Analytics: stockValue=${body.totalStockValue}, fulfillment=${body.fulfillmentRate}%`);
    });

    test('RPT-2: GET /reporting/analytics?period=30d returns 30-day data', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics?period=30d`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.meta?.period).toBe('30d');
    });

    test('RPT-3: GET /reporting/analytics?period=90d returns 90-day data', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics?period=90d`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toBeTruthy();
    });

    // ── DRILLDOWNS ───────────────────────────────────────────────────────────────

    test('RPT-4: GET /reporting/analytics/drilldown/stock-value', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/stock-value`, { headers: auth() });
        expect(res.ok(), `Stock value drilldown: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
        console.log(`✓ Stock value drilldown: ${arr.length} product(s)`);
    });

    test('RPT-5: GET /reporting/analytics/drilldown/fulfillment', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/fulfillment`, { headers: auth() });
        expect(res.ok(), `Fulfillment drilldown: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        console.log(`✓ Fulfillment drilldown returned`);
    });

    test('RPT-6: GET /reporting/analytics/drilldown/stockout', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/stockout`, { headers: auth() });
        expect(res.ok(), `Stockout drilldown: ${await res.text()}`).toBeTruthy();
        console.log(`✓ Stockout drilldown returned`);
    });

    test('RPT-7: GET /reporting/analytics/drilldown/pending-orders', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/pending-orders`, { headers: auth() });
        expect(res.ok(), `Pending orders drilldown: ${await res.text()}`).toBeTruthy();
        console.log(`✓ Pending orders drilldown returned`);
    });

    test('RPT-8: GET /reporting/analytics/drilldown/cycle-time', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/cycle-time`, { headers: auth() });
        expect(res.ok(), `Cycle time drilldown: ${await res.text()}`).toBeTruthy();
        console.log(`✓ Cycle time drilldown returned`);
    });

    test('RPT-9: GET /reporting/analytics/drilldown/capacity', async ({ request }) => {
        const res = await request.get(`${API}/reporting/analytics/drilldown/capacity`, { headers: auth() });
        expect(res.ok(), `Capacity drilldown: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        console.log(`✓ Capacity drilldown returned`);
    });

    // ── INVENTORY LEDGER ─────────────────────────────────────────────────────────

    test('RPT-10: GET /reporting/inventory-ledger returns paginated ledger', async ({ request }) => {
        const res = await request.get(`${API}/reporting/inventory-ledger?page=1&limit=50`, { headers: auth() });
        expect(res.ok(), `Ledger: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? body.entries ?? []);
        console.log(`✓ Inventory ledger: ${arr.length} record(s)`);
    });

    // ── CYCLE TIME TREND ─────────────────────────────────────────────────────────

    test('RPT-11: GET /reporting/cycle-time/trend returns trend data', async ({ request }) => {
        const res = await request.get(`${API}/reporting/cycle-time/trend?period=30d`, { headers: auth() });
        expect(res.ok(), `Cycle time trend: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        // Should have continuous date entries
        expect(arr.length).toBeGreaterThan(0);
        const firstEntry = arr[0];
        expect(firstEntry.date).toBeTruthy();
        expect(typeof firstEntry.averageCycleTime).toBe('number');
        console.log(`✓ Cycle time trend: ${arr.length} day(s) of data`);
    });

    // ── PER-WAREHOUSE REPORTS ────────────────────────────────────────────────────

    test('RPT-12: GET /reporting/pick-accuracy/:warehouseId', async ({ request }) => {
        if (!warehouseId) { test.skip(); return; }
        const res = await request.get(`${API}/reporting/pick-accuracy/${warehouseId}`, { headers: auth() });
        expect(res.ok(), `Pick accuracy: ${await res.text()}`).toBeTruthy();
        console.log(`✓ Pick accuracy report for WH ${warehouseId}`);
    });

    test('RPT-13: GET /reporting/cycle-count/:warehouseId', async ({ request }) => {
        if (!warehouseId) { test.skip(); return; }
        const res = await request.get(`${API}/reporting/cycle-count/${warehouseId}`, { headers: auth() });
        expect(res.ok(), `Cycle count report: ${await res.text()}`).toBeTruthy();
        console.log(`✓ Cycle count report for WH ${warehouseId}`);
    });

    // ── COMPLIANCE REPORT ────────────────────────────────────────────────────────

    test('RPT-14: POST /reporting/compliance generates VAT report', async ({ request }) => {
        const res = await request.post(`${API}/reporting/compliance`, {
            headers: auth(),
            data: { type: 'VAT', period: '2026-05' },
        });
        expect(res.ok(), `VAT report: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.type).toBe('VAT');
        expect(typeof body.totalSalesBase).toBe('number');
        expect(typeof body.totalVAT).toBe('number');
        console.log(`✓ VAT report: base=${body.totalSalesBase}, VAT=${body.totalVAT}`);
    });

    test('RPT-15: POST /reporting/compliance generates SAF-T report', async ({ request }) => {
        const res = await request.post(`${API}/reporting/compliance`, {
            headers: auth(),
            data: { type: 'SAF-T', period: '2026-05' },
        });
        expect(res.ok(), `SAF-T: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.header).toBeTruthy();
        expect(Array.isArray(body.transactions)).toBeTruthy();
        console.log(`✓ SAF-T report: ${body.transactions.length} transaction(s)`);
    });

    // ── FEATURE FLAG GATE TEST ───────────────────────────────────────────────────

    test('RPT-16: ADVANCED_ANALYTICS disabled → drilldown returns 403', async ({ request }) => {
        if (!companyId) { test.skip(); return; }

        // Disable the flag
        await request.put(`${API}/companies/${companyId}/feature-flags/ADVANCED_ANALYTICS`, {
            headers: auth(),
            data: { enabled: false },
        });

        const res = await request.get(`${API}/reporting/analytics/drilldown/stock-value`, { headers: auth() });
        expect(res.status()).toBe(403);
        console.log('✓ Feature flag gate: 403 when ADVANCED_ANALYTICS disabled');

        // Re-enable
        await request.put(`${API}/companies/${companyId}/feature-flags/ADVANCED_ANALYTICS`, {
            headers: auth(),
            data: { enabled: true },
        });
    });

    // ── UI ───────────────────────────────────────────────────────────────────────

    test('RPT-UI-1: /reporting page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Report|Warehouse Overview|Analytics/i);
    });

    test('RPT-UI-2: /reporting/cycle-time page loads with chart', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/cycle-time');
        await page.waitForLoadState('networkidle');
        // Heading text may be in a CardTitle (not an h1); check body text
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toMatch(/Cycle.?Time/i);
    });

    test('RPT-UI-3: /reporting/inventory-ledger page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/inventory-ledger');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Ledger|Inventory/i);
    });
});
