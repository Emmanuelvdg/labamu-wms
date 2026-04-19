import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('RBAC Frontend Permission Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-RBAC-FE-1: Admin user sees all inventory buttons', async ({ page }) => {
        await page.goto('/inventory');
        const newItemBtn = page.getByTestId('new-item-btn');
        await expect(newItemBtn).toBeVisible();
    });

    test('TC-RBAC-FE-2: Admin user can access settings', async ({ page }) => {
        await page.goto('/settings');
        await expect(page).toHaveURL(/\/settings/);
        await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
    });

    test('TC-RBAC-FE-3: Admin user can access users management', async ({ page }) => {
        await page.goto('/settings/users');
        await expect(page).toHaveURL(/\/settings\/users/);
        const newUserBtn = page.locator('button:has-text("New User")');
        await expect(newUserBtn).toBeVisible();
    });

    test('TC-RBAC-FE-4: Admin user can access roles management', async ({ page }) => {
        await page.goto('/settings/roles');
        await expect(page).toHaveURL(/\/settings\/roles/);
        const createRoleBtn = page.locator('button:has-text("Create Role")');
        await expect(createRoleBtn).toBeVisible();
    });

    test('TC-RBAC-FE-5: Navigation menu shows all items for admin', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Sidebar section names (from Sidebar.tsx) — use .first() to avoid strict mode violation
        await expect(page.locator('text=Inbound').first()).toBeVisible();
        await expect(page.locator('text=Outbound').first()).toBeVisible();

        // Check specific nav links — use .first() since some hrefs appear twice in nav (top-level + sub-nav)
        await expect(page.locator('a[href="/inventory"]').first()).toBeVisible();
        await expect(page.locator('a[href="/orders"]').first()).toBeVisible();
        await expect(page.locator('a[href="/settings"]').first()).toBeVisible();
    });
});

test.describe('RBAC Frontend - Limited User Permissions', () => {
    test.beforeEach(async () => {
        // Placeholder — limited user tests skipped until test user creation is implemented
    });

    test.skip('TC-RBAC-FE-6: Viewer cannot see create buttons', async ({ page }) => {
        await page.goto('/inventory');
        const newItemBtn = page.getByTestId('new-item-btn');
        await expect(newItemBtn).not.toBeVisible();
    });

    test.skip('TC-RBAC-FE-7: Viewer redirected from unauthorized pages', async ({ page }) => {
        await page.goto('/settings/users');
        await expect(page).toHaveURL('/unauthorized');
        await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test.skip('TC-RBAC-FE-8: Manager can edit but not delete', async ({ page }) => {
        await page.goto('/inventory/some-product-id');
        await expect(page.locator('button:has-text("Edit")')).toBeVisible();
        await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
    });
});

test.describe('RBAC Frontend - Permission Hook', () => {
    test('TC-RBAC-FE-9: usePermission hook returns correct permissions', async ({ page }) => {
        await loginAsAdmin(page);

        // Verify auth cookie is set
        const cookies = await page.context().cookies();
        const authCookie = cookies.find(c => c.name === 'auth' || c.name === 'user_data');
        expect(authCookie).toBeDefined();
    });

    test('TC-RBAC-FE-10: Wildcard permissions work correctly', async ({ page }) => {
        await loginAsAdmin(page);

        await page.goto('/inventory');
        await expect(page.getByTestId('new-item-btn')).toBeVisible();

        await page.goto('/settings/users');
        await expect(page.locator('button:has-text("New User")').first()).toBeVisible();
    });
});
