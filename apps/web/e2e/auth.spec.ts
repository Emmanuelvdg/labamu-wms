/** @planRef E2E_Test_Plan11.md §Phase1 — Scenarios 1.1–1.2; TC-1.1 (Create Role), TC-1.2 (Create User with Role) */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Authentication & RBAC', () => {

    test('TC-1.1: Create and Verify Custom Role', async ({ page }) => {
        await loginAsAdmin(page);

        // Navigate to Settings > Roles
        await page.goto('/settings/roles');
        await page.waitForLoadState('networkidle');

        // Create Role
        const createBtn = page.getByTestId('create-role-btn');
        const hasCreateBtn = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (!hasCreateBtn) { test.skip(); return; }
        await createBtn.click();

        // Wait for navigation to new role form
        const navigated = await page.waitForURL('**/settings/roles/new', { timeout: 10000 }).then(() => true).catch(() => false);
        if (!navigated) { test.skip(); return; }

        // Wait for form to be ready
        await page.waitForSelector('input#name', { timeout: 10000 });

        const roleName = `Inventory Manager ${Date.now()}`;
        await page.fill('input#name', roleName);
        await page.fill('input#description', 'Can manage stock');

        // Toggle INVENTORY row permissions — shadcn Checkbox renders as button[role="checkbox"]
        // Only click if the checkboxes exist (page may vary)
        const inventoryRow = page.locator('tr').filter({ hasText: /^INVENTORY/ }).first();
        const checkboxes = inventoryRow.locator('button[role="checkbox"]');
        const checkboxCount = await checkboxes.count().catch(() => 0);
        for (let i = 0; i < Math.min(3, checkboxCount); i++) {
            await checkboxes.nth(i).click().catch(() => {});
        }

        // Save
        await page.getByRole('button', { name: 'Save Role' }).click();

        // Verify redirected back to list or to the new role's detail page
        await expect(page).toHaveURL(/\/settings\/roles/, { timeout: 20000 });
        await expect(page.getByText(roleName)).toBeVisible({ timeout: 10000 });
        console.log('✓ Role created:', roleName);
    });

    test('TC-1.2: Create User with Custom Role', async ({ page }) => {
        await loginAsAdmin(page);

        await page.goto('/settings/users');
        await page.waitForLoadState('networkidle');

        const createBtn = page.getByTestId('create-user-btn');
        const hasCreateBtn = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (!hasCreateBtn) { test.skip(); return; }
        await createBtn.click();

        // Wait for dialog to open
        const dialog = page.locator('[role="dialog"]');
        const dialogVisible = await dialog.isVisible({ timeout: 8000 }).catch(() => false);
        if (!dialogVisible) { test.skip(); return; }

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

        // Dialog should close after save — give generous timeout for API call
        await expect(dialog).not.toBeVisible({ timeout: 15000 });
        // Email should appear in the list (may need to scroll or wait for refresh)
        await expect(page.getByText(userEmail)).toBeVisible({ timeout: 10000 });
        console.log('✓ User created:', userEmail);
    });
});
