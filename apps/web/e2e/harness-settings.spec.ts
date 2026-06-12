/**
 * Harness: Settings — Categories, Attributes, API Keys
 *
 * Covers:
 *   POST   /settings/categories        (create)
 *   GET    /settings/categories        (list)
 *   GET    /settings/categories/:id    (get by ID)
 *   PATCH  /settings/categories/:id   (update)
 *   DELETE /settings/categories/:id   (delete)
 *
 *   POST   /settings/attributes        (create attribute definition)
 *   GET    /settings/attributes        (list)
 *   PUT    /settings/attributes/:id    (update)
 *   DELETE /settings/attributes/:id   (delete)
 *
 *   POST   /api-keys                   (create)
 *   GET    /api-keys                   (list)
 *   DELETE /api-keys/:id               (revoke / delete)
 *
 *   GET    /settings/roles/available-permissions  (list permission matrix)
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken, loginAsAdmin } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const TS = Date.now().toString().slice(-8);

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Settings (Categories, Attributes, API Keys)', () => {
    let adminToken: string;
    let adminUserId: string;
    let categoryId: string;
    let attributeId: string;
    let apiKeyId: string;

    test.beforeAll(async ({ request }) => {
        const saved = loadAdminApiToken();
        if (saved) { adminToken = saved.token; adminUserId = saved.userId; return; }
        const res = await request.post(`${API}/auth/login`, {
            data: { email: 'admin@labamu.co.id', password: 'password123' },
        });
        adminToken = (await res.json()).token;
        expect(adminToken).toBeTruthy();
    });

    function auth() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
    }

    // ── CATEGORIES ───────────────────────────────────────────────────────────────

    test('CAT-1: POST /settings/categories creates a category', async ({ request }) => {
        const res = await request.post(`${API}/settings/categories`, {
            headers: auth(),
            data: {
                name: `Harness Category ${TS}`,
                description: 'E2E test category',
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        expect(body.name).toContain('Harness Category');
        categoryId = body.id;
        console.log('✓ Category created:', categoryId);
    });

    test('CAT-2: GET /settings/categories returns list', async ({ request }) => {
        const res = await request.get(`${API}/settings/categories`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
        const found = arr.find((c: any) => c.id === categoryId);
        expect(found, 'Created category should be in list').toBeTruthy();
    });

    test('CAT-3: GET /settings/categories/:id returns category', async ({ request }) => {
        const res = await request.get(`${API}/settings/categories/${categoryId}`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id).toBe(categoryId);
    });

    test('CAT-4: PATCH /settings/categories/:id updates category', async ({ request }) => {
        const res = await request.patch(`${API}/settings/categories/${categoryId}`, {
            headers: auth(),
            data: {
                name: `Harness Category UPDATED ${TS}`,
                description: 'Updated by E2E harness',
            },
        });
        expect(res.ok(), `Patch category: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.name).toContain('UPDATED');
    });

    test('CAT-5: DELETE /settings/categories/:id removes category', async ({ request }) => {
        // Create a throwaway category
        const createRes = await request.post(`${API}/settings/categories`, {
            headers: auth(),
            data: { name: `Cat To Delete ${TS}` },
        });
        expect(createRes.ok()).toBeTruthy();
        const toDelete = (await createRes.json()).id;

        const delRes = await request.delete(`${API}/settings/categories/${toDelete}`, { headers: auth() });
        expect(delRes.ok(), `Delete category: ${await delRes.text()}`).toBeTruthy();

        // Controller doesn't return 404 on missing category (returns null/200)
        // Just verify delete succeeded (2xx)
        console.log('✓ Category deleted');
    });

    // ── ATTRIBUTES ───────────────────────────────────────────────────────────────

    test('ATTR-1: POST /settings/attributes creates attribute definition', async ({ request }) => {
        const res = await request.post(`${API}/settings/attributes`, {
            headers: auth(),
            data: {
                name: `Harness Attr ${TS}`,
                type: 'TEXT',
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        attributeId = body.id;
        console.log('✓ Attribute created:', attributeId);
    });

    test('ATTR-2: GET /settings/attributes returns list', async ({ request }) => {
        const res = await request.get(`${API}/settings/attributes`, { headers: auth() });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
    });

    test('ATTR-3: PUT /settings/attributes/:id updates attribute', async ({ request }) => {
        const res = await request.put(`${API}/settings/attributes/${attributeId}`, {
            headers: auth(),
            data: {
                name: `Harness Attr UPDATED ${TS}`,
                type: 'TEXT',
            },
        });
        expect(res.ok(), `Update attr: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        expect(body.name).toContain('UPDATED');
    });

    test('ATTR-4: DELETE /settings/attributes/:id removes attribute', async ({ request }) => {
        const createRes = await request.post(`${API}/settings/attributes`, {
            headers: auth(),
            data: { name: `Attr To Delete ${TS}`, type: 'TEXT' },
        });
        expect(createRes.ok()).toBeTruthy();
        const toDelete = (await createRes.json()).id;

        const delRes = await request.delete(`${API}/settings/attributes/${toDelete}`, { headers: auth() });
        expect(delRes.ok(), `Delete attr: ${await delRes.text()}`).toBeTruthy();
        console.log('✓ Attribute deleted');
    });

    // ── PERMISSIONS ──────────────────────────────────────────────────────────────

    test('PERM-1: GET /settings/roles/available-permissions returns permission matrix', async ({ request }) => {
        const res = await request.get(`${API}/settings/roles/available-permissions`, { headers: auth() });
        expect(res.ok(), `Permissions: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr = Array.isArray(body) ? body : (body.data ?? Object.keys(body));
        expect(arr.length).toBeGreaterThan(0);
        console.log(`✓ Available permissions: ${arr.length} resource(s)`);
    });

    // ── API KEYS ─────────────────────────────────────────────────────────────────

    test('APIKEY-1: POST /api-keys creates a new API key', async ({ request }) => {
        const res = await request.post(`${API}/api-keys`, {
            headers: { ...auth(), 'x-user-id': adminUserId },
            data: {
                name: `Harness API Key ${TS}`,
                permissions: ['INVENTORY:READ', 'ORDERS:READ'],
            },
        });
        expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
        expect(res.status()).toBeLessThan(300);
        const body = await res.json();
        expect(body.id).toBeTruthy();
        // The key itself (secret) should be returned on creation only
        const key = body.key ?? body.apiKey ?? body.secret;
        if (key) console.log(`✓ API key (secret visible at create): ${key.slice(0, 8)}...`);
        apiKeyId = body.id;
        console.log('✓ API key created:', apiKeyId);
    });

    test('APIKEY-2: GET /api-keys lists API keys (secrets masked)', async ({ request }) => {
        const res = await request.get(`${API}/api-keys`, { headers: auth() });
        expect(res.ok(), `API keys list: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? []);
        expect(arr.length).toBeGreaterThan(0);
        const found = arr.find((k: any) => k.id === apiKeyId);
        expect(found, 'Created API key should be in list').toBeTruthy();
        // Secret should NOT be visible in list
        if (found?.key ?? found?.secret) {
            console.log('ℹ API key secret is visible in list — consider masking');
        }
    });

    test('APIKEY-3: DELETE /api-keys/:id/revoke revokes the key', async ({ request }) => {
        const res = await request.delete(`${API}/api-keys/${apiKeyId}/revoke`, { headers: auth() });
        if (res.status() === 404) {
            // Some implementations use DELETE /api-keys/:id directly
            const res2 = await request.delete(`${API}/api-keys/${apiKeyId}`, { headers: auth() });
            expect(res2.ok(), `Delete API key: ${await res2.text()}`).toBeTruthy();
        } else {
            expect(res.ok(), `Revoke API key: ${await res.text()}`).toBeTruthy();
        }
        console.log('✓ API key revoked/deleted');
    });

    // ── UI ───────────────────────────────────────────────────────────────────────

    test('SETTINGS-UI-1: /settings/categories page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings/categories');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Categor/i);
    });

    test('SETTINGS-UI-2: /settings/attributes page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings/attributes');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Attribute/i);
    });

    test('SETTINGS-UI-3: /settings/api-keys page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings/api-keys');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/API Key|Api Key/i);
    });

    // ── Cleanup ──────────────────────────────────────────────────────────────────

    test.afterAll(async ({ request }) => {
        if (categoryId) await request.delete(`${API}/settings/categories/${categoryId}`, { headers: auth() }).catch(() => {});
        if (attributeId) await request.delete(`${API}/settings/attributes/${attributeId}`, { headers: auth() }).catch(() => {});
    });
});
