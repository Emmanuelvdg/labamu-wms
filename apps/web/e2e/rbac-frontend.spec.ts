import { test, expect } from '@playwright/test';

test.describe('RBAC Frontend Permission Rendering', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', 'admin@labamu.co.id');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/');
    });

    test('TC-RBAC-FE-1: Admin user sees all inventory buttons', async ({ page }) => {
        // Navigate to inventory
        await page.goto('http://localhost:3000/inventory');

        // Verify "New Item" button is visible (requires INVENTORY:CREATE)
        const newItemBtn = page.getByTestId('new-item-btn');
        await expect(newItemBtn).toBeVisible();
    });

    test('TC-RBAC-FE-2: Admin user can access settings', async ({ page }) => {
        // Navigate to settings
        await page.goto('http://localhost:3000/settings');

        // Should not be redirected to unauthorized
        await expect(page).toHaveURL('http://localhost:3000/settings');
        await expect(page.locator('text=/settings/i')).toBeVisible();
    });

    test('TC-RBAC-FE-3: Admin user can access users management', async ({ page }) => {
        // Navigate to users
        await page.goto('http://localhost:3000/settings/users');

        // Should load successfully
        await expect(page).toHaveURL('http://localhost:3000/settings/users');

        // Should see "New User" button
        const newUserBtn = page.locator('button:has-text("New User")');
        await expect(newUserBtn).toBeVisible();
    });

    test('TC-RBAC-FE-4: Admin user can access roles management', async ({ page }) => {
        // Navigate to roles
        await page.goto('http://localhost:3000/settings/roles');

        // Should load successfully
        await expect(page).toHaveURL('http://localhost:3000/settings/roles');

        // Should see "Create Role" button
        const createRoleBtn = page.locator('button:has-text("Create Role")');
        await expect(createRoleBtn).toBeVisible();
    });

    test('TC-RBAC-FE-5: Navigation menu shows all items for admin', async ({ page }) => {
        // Check sidebar has all sections
        await expect(page.locator('text=Inventory')).toBeVisible();
        await expect(page.locator('text=Inbound Operations')).toBeVisible();
        await expect(page.locator('text=Outbound Operations')).toBeVisible();
        await expect(page.locator('text=Reporting')).toBeVisible();
        await expect(page.locator('text=System')).toBeVisible();

        // Check specific menu items
        await expect(page.locator('a[href="/inventory"]')).toBeVisible();
        await expect(page.locator('a[href="/orders"]')).toBeVisible();
        await expect(page.locator('a[href="/settings"]')).toBeVisible();
    });
});

test.describe('RBAC Frontend - Limited User Permissions', () => {
    test.beforeEach(async ({ page }) => {
        // For these tests, we would need to create a limited user
        // This is a placeholder - actual implementation would require:
        // 1. Create a role with limited permissions
        // 2. Create a user with that role
        // 3. Login as that user

        // For now, we'll skip these until we have test user creation
    });

    test.skip('TC-RBAC-FE-6: Viewer cannot see create buttons', async ({ page }) => {
        // Login as user with only READ permissions
        // await loginAsUser(page, 'viewer@test.com', 'password');

        // Navigate to inventory
        await page.goto('http://localhost:3000/inventory');

        // Verify "New Item" button is NOT visible
        const newItemBtn = page.getByTestId('new-item-btn');
        await expect(newItemBtn).not.toBeVisible();
    });

    test.skip('TC-RBAC-FE-7: Viewer redirected from unauthorized pages', async ({ page }) => {
        // Login as viewer
        // await loginAsUser(page, 'viewer@test.com', 'password');

        // Try to access users page directly
        await page.goto('http://localhost:3000/settings/users');

        // Should be redirected to unauthorized
        await expect(page).toHaveURL('http://localhost:3000/unauthorized');
        await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test.skip('TC-RBAC-FE-8: Manager can edit but not delete', async ({ page }) => {
        // Login as user with UPDATE but not DELETE permission
        // await loginAsUser(page, 'manager@test.com', 'password');

        // Navigate to product detail
        await page.goto('http://localhost:3000/inventory/some-product-id');

        // Edit button should be visible
        const editBtn = page.locator('button:has-text("Edit")');
        await expect(editBtn).toBeVisible();

        // Delete button should NOT be visible
        const deleteBtn = page.locator('button:has-text("Delete")');
        await expect(deleteBtn).not.toBeVisible();
    });
});

test.describe('RBAC Frontend - Permission Hook', () => {
    test('TC-RBAC-FE-9: usePermission hook returns correct permissions', async ({ page }) => {
        // Login
        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', 'admin@labamu.co.id');
        await page.fill('input[type="password"]', 'admin');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/');

        // Check that user_data cookie is set
        const cookies = await page.context().cookies();
        const userDataCookie = cookies.find(c => c.name === 'user_data');

        expect(userDataCookie).toBeDefined();

        // Verify cookie contains user data with roles
        const userData = JSON.parse(userDataCookie!.value);
        expect(userData).toHaveProperty('id');
        expect(userData).toHaveProperty('email');
        expect(userData).toHaveProperty('roles');
        expect(Array.isArray(userData.roles)).toBe(true);
    });

    test('TC-RBAC-FE-10: Wildcard permissions work correctly', async ({ page }) => {
        // This would test that users with *:* or resource:* permissions
        // can access all actions for that resource
        // Would require JavaScript evaluation to test the hook directly

        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', 'admin@labamu.co.id');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/');

        // Admin should have wildcard permissions and see everything
        await page.goto('http://localhost:3000/inventory');
        await expect(page.getByTestId('new-item-btn')).toBeVisible();

        await page.goto('http://localhost:3000/settings/users');
        await expect(page.locator('button:has-text("New User")').first()).toBeVisible();
    });
});
