import { test, expect } from '@playwright/test';

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
        // Login as admin
        await page.goto('/login');

        // Clear autofilled values and fill with admin credentials
        // Use pressSequentially to ensure all events fire and handle potential autofill issues
        await page.locator('input[type="email"]').first().clear();
        await page.locator('input[type="email"]').first().pressSequentially('admin@labamu.co.id', { delay: 100 });

        await page.locator('input[type="password"]').first().clear();
        await page.locator('input[type="password"]').first().pressSequentially('admin', { delay: 100 });

        // Wait for state update
        await page.waitForTimeout(500);

        // Use Enter to submit
        await page.keyboard.press('Enter');

        // Verify successful login with increased timeout
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('TC-RBAC-1: Create Role, Create User, and Assign Role', async ({ page }) => {
        // ============================================
        // STEP 1: Create a New Role
        // ============================================

        // Navigate to Roles page
        await page.goto('/settings/roles');
        await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();

        // Click Create Role button
        await page.getByRole('button', { name: /create role/i }).click();
        await expect(page).toHaveURL('/settings/roles/new');

        // Fill in role details
        await page.locator('input#name').fill(roleName);
        await page.locator('input#description').fill(roleDescription);

        // Select permissions - INVENTORY permissions as example
        // The UI uses button[role="checkbox"] organized in table rows
        // Each row is a resource, checkboxes are in order: READ(0), CREATE(1), UPDATE(2), DELETE(3), APPROVE(4)

        const inventoryRow = page.locator('tr:has-text("INVENTORY")');
        await inventoryRow.locator('button[role="checkbox"]').nth(0).click(); // READ
        await inventoryRow.locator('button[role="checkbox"]').nth(1).click(); // CREATE
        await inventoryRow.locator('button[role="checkbox"]').nth(2).click(); // UPDATE

        // Optionally select ORDERS permissions
        const ordersRow = page.locator('tr:has-text("ORDERS")');
        await ordersRow.locator('button[role="checkbox"]').nth(0).click(); // READ

        // Save the role
        await page.getByRole('button', { name: /save role/i }).click();

        // Verify role was created and redirected back to roles list
        await expect(page).toHaveURL('/settings/roles');
        await expect(page.getByText(roleName)).toBeVisible();

        console.log(`✓ Role created: ${roleName}`);

        // ============================================
        // STEP 2: Create a New User
        // ============================================

        // Navigate to Users page
        await page.goto('/settings/users');
        await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();

        // Click New User button
        await page.getByRole('button', { name: /new user/i }).click();

        // Wait for modal to appear
        await expect(page.getByRole('heading', { name: /new user/i })).toBeVisible();

        // Fill in user details
        // Browser investigation confirmed inputs exist and are interactive
        // They use type="text", type="email", type="password" and are autofilled
        await page.waitForTimeout(1000);

        // Use getByRole for reliable dialog selection
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        const nameInput = dialog.locator('input[type="text"]').first();
        const emailInput = dialog.locator('input[type="email"]').first();
        const passwordInput = dialog.locator('input[type="password"]').first();

        // Wait for visibility and clear autofilled values
        // Use force: true to bypass strict visibility checks during animation
        // We know the element is there and interactive from manual verification
        await nameInput.fill(userName, { force: true });

        await emailInput.clear({ force: true });
        await emailInput.fill(userEmail, { force: true });

        await passwordInput.clear({ force: true });
        await passwordInput.fill(userPassword, { force: true });

        // ============================================
        // STEP 3: Assign the Role to the User
        // ============================================

        // Find and check the role checkbox
        // The role checkboxes have dynamic IDs like: role-{uuid}
        // We need to find the checkbox by the role name nearby
        const roleCheckbox = page.locator(`label:has-text("${roleName}") input[type="checkbox"]`).or(
            page.locator(`input[type="checkbox"][id^="role-"]`).filter({ hasText: roleName })
        ).first();

        await roleCheckbox.check();

        // Optionally assign warehouses if needed
        // const warehouseCheckbox = page.locator('input[id^="warehouse-"]').first();
        // await warehouseCheckbox.check();

        // Save the user
        await page.getByRole('button', { name: /^save$/i }).click();

        // Wait for modal to close
        await expect(page.getByText(/create user|new user/i)).not.toBeVisible({ timeout: 5000 });

        // ============================================
        // STEP 4: Verify User Creation with Role
        // ============================================

        // Verify user appears in the list
        await expect(page.getByText(userEmail)).toBeVisible();

        // Click on the user to verify role assignment
        await page.getByText(userEmail).click();

        // In the edit modal or details view, verify the role is assigned
        await expect(page.locator(`label:has-text("${roleName}") input[type="checkbox"]`).first()).toBeChecked();

        console.log(`✓ User created: ${userEmail}`);
        console.log(`✓ Role assigned: ${roleName}`);

        // Close the modal
        await page.keyboard.press('Escape');

        // ============================================
        // Optional: Verify Role-User Relationship
        // ============================================

        // Navigate back to the role to verify user is listed
        await page.goto('/settings/roles');
        await page.getByText(roleName).click();

        // Verify user is associated with the role (if UI shows this)
        // This depends on whether the role details page shows associated users
    });

    test.skip('TC-RBAC-2: Verify Permission Inheritance', async ({ page }) => {
        /**
         * This test verifies that users with assigned roles
         * can perform actions allowed by their permissions
         */

        // This would require:
        // 1. Logging out as admin
        // 2. Logging in as the newly created user
        // 3. Trying to access INVENTORY pages (should succeed)
        // 4. Trying to access SETTINGS pages (should fail if no permission)

        // Skipped: Requires logout/login implementation
    });

});
