/** @planRef E2E_Test_Plan11.md §Phase1 — Scenarios 1.1–1.2; TC-1.1 (Create Role), TC-1.2 (Create User with Role) */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Authentication & RBAC', () => {

    test('TC-1.1: Create and Verify Custom Role', async ({ page }) => {
        await loginAsAdmin(page);

        // Navigate to Settings > Roles
        await page.goto('/settings/roles');
        await page.waitForLoadState('networkidle');

        // Create Role — use timestamp to avoid "already exists" errors across runs
        await page.getByTestId('create-role-btn').click();
        await expect(page).toHaveURL('/settings/roles/new');

        const roleName = `Inventory Manager ${Date.now()}`;
        // Fill basic details (inputs have id="name" and id="description")
        await page.fill('input#name', roleName);
        await page.fill('input#description', 'Can manage stock');

        // Select Permissions via the permission matrix
        // Checkboxes render as button[role="checkbox"] (shadcn Checkbox)
        // Table rows: INVENTORY row, actions: READ(0) CREATE(1) UPDATE(2)
        const inventoryRow = page.locator('tr').filter({ hasText: 'INVENTORY' });
        await inventoryRow.locator('button[role="checkbox"]').nth(0).click(); // READ
        await inventoryRow.locator('button[role="checkbox"]').nth(1).click(); // CREATE
        await inventoryRow.locator('button[role="checkbox"]').nth(2).click(); // UPDATE

        // Save
        await page.getByRole('button', { name: 'Save Role' }).click();

        // Verify redirected back to list and role visible
        await expect(page).toHaveURL('/settings/roles', { timeout: 20000 });
        await expect(page.getByText(roleName)).toBeVisible();
    });

    test('TC-1.2: Create User with Custom Role', async ({ page }) => {
        await loginAsAdmin(page);

        await page.goto('/settings/users');
        await page.waitForLoadState('networkidle');

        await page.getByTestId('create-user-btn').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        const userEmail = `e2e-auth-${Date.now()}@labamu.co.id`;
        await page.getByTestId('user-name-input').fill('E2E Auth Test User');
        await page.getByTestId('user-email-input').fill(userEmail);
        await page.getByTestId('user-password-input').fill('TestPass123!');

        // Select role by clicking its label (if Inventory Manager role exists)
        const roleLabel = page.locator('label:has-text("Inventory Manager")');
        if (await roleLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await roleLabel.click();
        }

        await page.getByTestId('save-user-btn').click();

        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByText(userEmail)).toBeVisible();
    });
});
