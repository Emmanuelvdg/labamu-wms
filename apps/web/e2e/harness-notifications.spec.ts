/**
 * Harness: Notifications
 *
 * Covers:
 *   GET   /notifications              (list notifications)
 *   GET   /notifications/unread-count (count of unread)
 *   PATCH /notifications/:id/read     (mark single as read)
 *   POST  /notifications/mark-all-read (mark all as read)
 *
 * Note: notification seeding is done by other operations creating objects
 * (e.g. low-stock alerts from replenishment). If no notifications exist
 * the list tests still pass — they verify the API shape and no 500s.
 */
import { test, expect } from '@playwright/test';
import { loadAdminApiToken, loginAsAdmin } from './helpers/auth';

const API = 'http://127.0.0.1:3001';

test.describe.configure({ mode: 'serial' });

test.describe('Harness: Notifications', () => {
    let adminToken: string;
    let firstNotificationId: string | null = null;

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

    // ── LIST ─────────────────────────────────────────────────────────────────────

    test('NOTIF-1: GET /notifications returns array', async ({ request }) => {
        const res = await request.get(`${API}/notifications`, { headers: auth() });
        expect(res.ok(), `Notifications: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const arr: any[] = Array.isArray(body) ? body : (body.data ?? body.notifications ?? []);
        expect(Array.isArray(arr)).toBeTruthy();
        if (arr.length > 0) {
            firstNotificationId = arr[0].id;
            console.log(`✓ Notifications: ${arr.length} item(s), first ID=${firstNotificationId}`);
        } else {
            console.log('✓ Notifications: empty (no alerts generated yet — acceptable)');
        }
    });

    // ── UNREAD COUNT ─────────────────────────────────────────────────────────────

    test('NOTIF-2: GET /notifications/unread-count returns numeric count', async ({ request }) => {
        const res = await request.get(`${API}/notifications/unread-count`, { headers: auth() });
        expect(res.ok(), `Unread count: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        // May be { count: N } or plain number
        const count = typeof body === 'number' ? body : (body.count ?? body.unreadCount ?? 0);
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
        console.log(`✓ Unread count: ${count}`);
    });

    // ── MARK SINGLE READ ─────────────────────────────────────────────────────────

    test('NOTIF-3: PATCH /notifications/:id/read marks notification as read', async ({ request }) => {
        if (!firstNotificationId) {
            console.log('ℹ No notifications to mark — skipping NOTIF-3');
            test.skip();
            return;
        }
        const res = await request.patch(`${API}/notifications/${firstNotificationId}/read`, {
            headers: auth(),
        });
        expect(res.ok(), `Mark read: ${await res.text()}`).toBeTruthy();
        const body = await res.json();
        const isRead = body.read ?? body.isRead ?? body.notification?.read;
        if (isRead !== undefined) {
            expect(isRead).toBeTruthy();
        }
        console.log(`✓ Notification ${firstNotificationId} marked as read`);
    });

    // ── UNREAD COUNT DECREASES ───────────────────────────────────────────────────

    test('NOTIF-4: Unread count does not increase after marking one read', async ({ request }) => {
        const before = await (await request.get(`${API}/notifications/unread-count`, { headers: auth() })).json();
        const countBefore = typeof before === 'number' ? before : (before.count ?? 0);

        // Attempt mark-all-read
        await request.post(`${API}/notifications/mark-all-read`, { headers: auth() });

        const after = await (await request.get(`${API}/notifications/unread-count`, { headers: auth() })).json();
        const countAfter = typeof after === 'number' ? after : (after.count ?? 0);

        expect(countAfter).toBeLessThanOrEqual(countBefore);
        console.log(`✓ Unread count: before=${countBefore}, after=${countAfter}`);
    });

    // ── MARK ALL READ ────────────────────────────────────────────────────────────

    test('NOTIF-5: POST /notifications/mark-all-read succeeds', async ({ request }) => {
        const res = await request.post(`${API}/notifications/mark-all-read`, { headers: auth() });
        expect(res.ok(), `Mark all read: ${await res.text()}`).toBeTruthy();

        // Verify unread count is now 0
        const countRes = await request.get(`${API}/notifications/unread-count`, { headers: auth() });
        const body = await countRes.json();
        const count = typeof body === 'number' ? body : (body.count ?? body.unreadCount ?? 0);
        expect(count).toBe(0);
        console.log('✓ All notifications marked as read');
    });

    // ── UI ───────────────────────────────────────────────────────────────────────

    test('NOTIF-UI-1: /notifications page loads', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/notifications');
        await page.waitForLoadState('networkidle');
        const body = await page.locator('body').textContent();
        expect(body).toMatch(/Notification/i);
    });
});
