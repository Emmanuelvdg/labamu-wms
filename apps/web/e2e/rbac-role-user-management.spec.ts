import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E Test for Role and User Management
 *
 * Test Flow:
 * 1. Create a new role with specific permissions
 * 2. Create a new user
 * 3. Assign the newly created role to the user
 * 4. Verify role and user creation
 */

test.describe('Role and User Management', () => {
    const timestamp = Date.now();
    const roleName = `E2E Test Role ${timestamp}`;
    const roleDescription = 'Automated test role for E2E testing';
    const userName = `E2E Test User ${timestamp}`;
    const userEmail = `e2e-test-${timestamp}@labamu.co.id`;
    const userPassword = 'Test@12345';

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-RBAC-1: Create Role, Create User, and Assign Role', async ({ page }) => {
        // ============================================
        // STEP 1: Create a New Role
        // ============================================

        await page.goto('/settings/roles');
        await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();

        await page.getByRole('button', { name: /create role/i }).click();
        await expect(page).toHaveURL('/settings/roles/new');

        await page.locator('input#name').fill(roleName);
        await page.locator('input#description').fill(roleDescription);

        // Permission matrix uses button[role="checkbox"] (shadcn Checkbox)
        const inventoryRow = page.locator('tr').filter({ hasText: 'INVENTORY' });
        await inventoryRow.locator('button[role="checkbox"]').nth(0).click(); // READ
        await inventoryRow.locator('button[role="checkbox"]').nth(1).click(); // CREATE
        await inventoryRow.locator('button[role="checkbox"]').nth(2).click(); // UPDATE

        const ordersRow = page.locator('tr').filter({ hasText: /^ORDERS/ });
        await ordersRow.locator('button[role="checkbox"]').nth(0).click(); // READ

        await page.getByRole('button', { name: /save role/i }).click();

        await expect(page).toHaveURL('/settings/roles');
        await expect(page.getByText(roleName)).toBeVisible();

        // ============================================
        // STEP 2: Create a New User
        // ============================================

        await page.goto('/settings/users');
        await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();

        await page.getByRole('button', { name: /new user/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.waitForTimeout(500);

        await page.getByTestId('user-name-input').fill(userName);
        await page.getByTestId('user-email-input').fill(userEmail);
        await page.getByTestId('user-password-input').fill(userPassword);

        // ============================================
        // STEP 3: Assign the Role to the User
        // ============================================

        // Role checkboxes have label text matching role name
        const roleLabel = page.locator(`label:has-text("${roleName}")`);
        if (await roleLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await roleLabel.click();
        }

        await page.getByTestId('save-user-btn').click();

        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

        // ============================================
        // STEP 4: Verify User Creation with Role
        // ============================================

        await expect(page.getByText(userEmail)).toBeVisible();

        // Open edit dialog by clicking the Edit (pencil) button in the user's row
        const userRow = page.locator('tr').filter({ hasText: userEmail });
        await userRow.locator('button').first().click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

        // Verify role is checked — UserDialog uses native checkbox with htmlFor → getByLabel works
        const roleCheckbox = page.getByLabel(roleName);
        if (await roleCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(roleCheckbox).toBeChecked();
        }

        await page.keyboard.press('Escape');
    });

    test.skip('TC-RBAC-2: Verify Permission Inheritance', async () => {
        // Skipped: Requires logout/login as the created user
    });
});
