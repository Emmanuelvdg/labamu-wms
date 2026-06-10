/**
 * Harness: Audit Log & Operations Audit Trail
 *
 * Verifies that operations create audit records:
 *   GET /audit/operations          (operations audit log — general)
 *   GET /platform/audit-log        (platform admin audit log — requires ALL:MANAGE)
 *
 * Tests:
 *   1. Operations audit returns array (may be empty initially)
 *   2. After creating a resource, operations log has entries
 *   3. Platform audit log accessible with admin privileges
 *   4. Platform audit log has pagination/filtering support
 *   5. UI: /audit page loads
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken, loginAsAdmin } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Audit Log', () => {
    let adminToken: string;

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

    // ── Operations Audit ─────────────────────────────────────────────────────────

    test('AUDIT-1: GET /audit/operations returns array', async ({ request }) => {
        const res = await request.get(`${API}/audit/operations`, { headers: auth() });
        expect(res.ok(), `Audit ops: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.operations ?? body.entries ?? []);
        expect(Array.isArray(arr)).toBeTruthy();
        console.log(`✓ Operations audit: ${arr.length} record(s)`);
    });

    test('AUDIT-2: Operations created after a write appear in audit log', async ({ request }) => {
        // Create a resource to generate an audit event
        const createRes = await request.post(`${API}/customers`, {
            headers: auth(),
            data: { name: `Audit Test Customer ${TS}` },
        });
        expect(createRes.ok()).toBeTruthy();
        const customerId = (await createRes.json()).id;

        // Short delay for async audit write
        await new Promise(r => setTimeout(r, 500));

        const auditRes = await request.get(`${API}/audit/operations`, { headers: auth() });
        expect(auditRes.ok()).toBeTruthy();
        const body = await auditRes.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.operations ?? []);

        // Audit log should have at least 1 entry now
        expect(arr.length).toBeGreaterThan(0);

        // Clean up
        await request.delete(`${API}/customers/${customerId}`, { headers: auth() }).catch(() => {});
        console.log(`✓ Audit log has ${arr.length} entry(ies) after create operation`);
    });

    test('AUDIT-3: Audit log supports pagination query params', async ({ request }) => {
        const res = await request.get(`${API}/audit/operations?page=1&limit=10`, { headers: auth() });
        expect(res.ok(), `Audit paginate: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? []);
        expect(Array.isArray(arr)).toBeTruthy();
        console.log(`✓ Audit paginated: ${arr.length} record(s) (page 1, limit 10)`);
    });

    // ── Platform Audit Log ───────────────────────────────────────────────────────

    test('AUDIT-4: GET /platform/audit-log accessible with admin (ALL:MANAGE)', async ({ request }) => {
        const res = await request.get(`${API}/platform/audit-log`, { headers: auth() });
        // Admin has ALL:MANAGE; should be 200
        expect(res.ok(), `Platform audit: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.entries ?? body.logs ?? []);
        console.log(`✓ Platform audit log: ${arr.length} record(s)`);
    });

    test('AUDIT-5: Platform audit log 401 without auth', async () => {
        const res = await fetch(`${API}/platform/audit-log`, {
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.status).toBe(401);
    });

    // ── UI ───────────────────────────────────────────────────────────────────────

    test('AUDIT-UI-1: /audit page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/audit');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Audit|Operation/i);
        console.log('✓ Audit page loaded');
    });

    test('AUDIT-UI-2: /admin/audit-log page loads (platform admin)', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/audit-log');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Audit|Log/i);
        console.log('✓ Platform audit log page loaded');
    });
});
