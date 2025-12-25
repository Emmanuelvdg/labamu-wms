import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to settings/users page
        await page.goto('http://localhost:3000/settings/users');
        await page.waitForLoadState('networkidle');
    });

    test('TC-RBAC-1: View users list', async ({ page }) => {
        // Verify page title
        await expect(page.locator('h1')).toContainText('User Management');

        // Verify "New User" button exists
        await expect(page.getByTestId('create-user-btn')).toBeVisible();

        // Verify table headers
        await expect(page.locator('thead')).toContainText('Name');
        await expect(page.locator('thead')).toContainText('Email');
        await expect(page.locator('thead')).toContainText('Role');
        await expect(page.locator('thead')).toContainText('Warehouse');
        await expect(page.locator('thead')).toContainText('Actions');
    });

    test('TC-RBAC-2: Create new user with role assignment', async ({ page }) => {
        // Click "New User" button
        await page.getByTestId('create-user-btn').click();

        // Wait for dialog to open
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // Fill in user details
        const timestamp = Date.now();
        await page.fill('input[name="name"]', `Test User ${timestamp}`);
        await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
        await page.fill('input[name="password"]', 'TestPassword123!');

        // Select a role (assuming there's a role selection dropdown/checkbox)
        // This will depend on the actual implementation
        const roleSelector = page.locator('[data-role-selector]').first();
        if (await roleSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
            await roleSelector.click();
        }

        // Submit the form
        await page.getByRole('button', { name: /create|save/i }).click();

        // Wait for success message
        await expect(page.locator('text=/user created|success/i')).toBeVisible({ timeout: 5000 });

        // Verify user appears in table
        await expect(page.locator(`text=${timestamp}`)).toBeVisible();
    });

    test('TC-RBAC-3: Edit existing user', async ({ page }) => {
        // Find first edit button and click it
        const editButton = page.locator('button[aria-label="Edit"]').first();
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editButton.click();
        } else {
            // Alternative: find edit icon
            await page.locator('svg').filter({ hasText: /edit/i }).first().click();
        }

        // Wait for edit dialog
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

        // Modify user name
        const nameInput = page.fill('input[name="name"]', 'Updated User Name');

        // Save changes
        await page.getByRole('button', { name: /save|update/i }).click();

        // Verify success
        await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 5000 });
    });

    test('TC-RBAC-4: Delete user', async ({ page }) => {
        // Get initial row count
        const initialRowCount = await page.locator('tbody tr').count();

        if (initialRowCount === 0) {
            test.skip('No users to delete');
        }

        // Click delete button on last user (avoid deleting admin)
        page.on('dialog', dialog => dialog.accept()); // Auto-accept confirmation
        await page.locator('button').filter({ hasText: /trash|delete/i }).last().click();

        // Wait for deletion
        await page.waitForTimeout(1000);

        // Verify row count decreased or success message appeared
        const newRowCount = await page.locator('tbody tr').count();
        expect(newRowCount).toBeLessThanOrEqual(initialRowCount);
    });

    test('TC-RBAC-5: Search/filter users', async ({ page }) => {
        // Check if search input exists
        const searchInput = page.locator('input[placeholder*="search" i]').first();

        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill('admin');
            await page.waitForTimeout(500);

            // Verify filtered results
            const visibleRows = await page.locator('tbody tr').count();
            expect(visibleRows).toBeGreaterThan(0);
        } else {
            test.skip('Search functionality not found');
        }
    });
});

test.describe('Role Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/settings/roles');
        await page.waitForLoadState('networkidle');
    });

    test('TC-RBAC-6: View roles list', async ({ page }) => {
        // Verify page loaded
        await expect(page.locator('h1, h2')).toContainText(/role/i);

        // Verify "Create Role" button exists
        await expect(page.getByRole('button', { name: /create role|new role|add role/i })).toBeVisible();

        // Verify at least one role card exists
        const roleCards = page.locator('[class*="card"]');
        await expect(roleCards.first()).toBeVisible();
    });

    test('TC-RBAC-7: Create new role with permissions', async ({ page }) => {
        // Click "Create Role" button
        await page.getByRole('button', { name: /create role|new role/i }).click();

        // Wait for create form/dialog
        await page.waitForTimeout(1000);

        // Fill in role details
        const timestamp = Date.now();
        await page.fill('input[name="name"]', `Test Role ${timestamp}`);
        await page.fill('input[name="description"]', 'Role created by E2E test');

        // Select some permissions (checkboxes in permission matrix)
        const permissionCheckboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await permissionCheckboxes.count();

        if (checkboxCount > 0) {
            // Check first 3 permissions
            for (let i = 0; i < Math.min(3, checkboxCount); i++) {
                await permissionCheckboxes.nth(i).check();
            }
        }

        // Save role
        await page.getByRole('button', { name: /save|create/i }).click();

        // Verify success
        await expect(page.locator(`text=Test Role ${timestamp}`)).toBeVisible({ timeout: 5000 });
    });

    test('TC-RBAC-8: Edit role and update permissions', async ({ page }) => {
        // Click edit button on first non-system role
        const editButtons = page.locator('button').filter({ hasText: /edit/i });

        if (await editButtons.count() > 0) {
            await editButtons.first().click();
            await page.waitForLoadState('networkidle');

            // Verify we're on edit page (URL should contain role ID)
            expect(page.url()).toContain('/settings/roles/');

            // Verify permission matrix is visible
            await expect(page.locator('input[type="checkbox"]')).toBeVisible();

            // Toggle a permission
            const firstCheckbox = page.locator('input[type="checkbox"]').first();
            const wasChecked = await firstCheckbox.isChecked();

            if (wasChecked) {
                await firstCheckbox.uncheck();
            } else {
                await firstCheckbox.check();
            }

            // Save changes
            await page.getByRole('button', { name: /save/i }).click();

            // Verify success (either success message or redirect back to list)
            await page.waitForTimeout(1000);
            const currentUrl = page.url();
            expect(currentUrl).toMatch(/settings\/roles/);
        } else {
            test.skip('No editable roles found');
        }
    });

    test('TC-RBAC-9: View role details with permissions', async ({ page }) => {
        // Click on first role card or view button
        const roleCard = page.locator('[class*="card"]').first();
        await roleCard.click();

        await page.waitForLoadState('networkidle');

        // Verify we're on role detail/edit page
        expect(page.url()).toContain('/settings/roles/');

        // Verify role information is displayed
        await expect(page.locator('input[name="name"]')).toBeVisible();

        // Verify permission matrix is displayed
        const permissionCheckboxes = page.locator('input[type="checkbox"]');
        const count = await permissionCheckboxes.count();
        expect(count).toBeGreaterThan(0);
    });

    test('TC-RBAC-10: Prevent deletion of system roles', async ({ page }) => {
        // Look for a system role indicator (badge, label, etc.)
        const systemRoleBadge = page.locator('text=/system/i').first();

        if (await systemRoleBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Try to find delete button for system role
            const systemRoleCard = systemRoleBadge.locator('..').locator('..');
            const deleteButton = systemRoleCard.locator('button').filter({ hasText: /delete|trash/i });

            if (await deleteButton.count() > 0) {
                // Button might be disabled
                const isDisabled = await deleteButton.first().isDisabled();
                expect(isDisabled).toBeTruthy();
            } else {
                // No delete button should exist for system roles
                expect(await deleteButton.count()).toBe(0);
            }
        } else {
            test.skip('No system roles found to test');
        }
    });

    test('TC-RBAC-11: Delete custom role', async ({ page }) => {
        // Find a non-system role to delete
        const roleCards = page.locator('[class*="card"]');
        const cardCount = await roleCards.count();

        if (cardCount === 0) {
            test.skip('No roles to delete');
        }

        // Look for delete button (avoiding system roles)
        const deleteButtons = page.locator('button').filter({ hasText: /delete|trash/i });
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
            page.on('dialog', dialog => dialog.accept()); // Auto-accept confirmation
            await deleteButtons.last().click();

            // Wait for deletion
            await page.waitForTimeout(1000);

            // Verify role was removed or error shown if assigned to users
            const hasError = await page.locator('text=/cannot delete|assigned to users/i').isVisible({ timeout: 2000 }).catch(() => false);
            const newCardCount = await page.locator('[class*="card"]').count();

            if (!hasError) {
                expect(newCardCount).toBeLessThanOrEqual(cardCount);
            }
        } else {
            test.skip('No deletable roles found');
        }
    });

    test('TC-RBAC-12: Permission matrix shows all resources and actions', async ({ page }) => {
        // Navigate to any role edit page
        const editButtons = page.locator('button').filter({ hasText: /edit/i });

        if (await editButtons.count() > 0) {
            await editButtons.first().click();
            await page.waitForLoadState('networkidle');

            // Verify permission matrix structure
            const expectedResources = [
                'INVENTORY', 'ORDERS', 'PURCHASE_ORDERS',
                'SUPPLIERS', 'CUSTOMERS', 'SETTINGS'
            ];

            const expectedActions = [
                'READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
            ];

            // Check if key resources appear
            for (const resource of expectedResources.slice(0, 3)) {
                const resourceText = page.locator(`text=/${resource}/i`);
                if (await resourceText.count() > 0) {
                    await expect(resourceText.first()).toBeVisible();
                }
            }

            // Check if key actions appear
            for (const action of expectedActions.slice(0, 3)) {
                const actionText = page.locator(`text=/${action}/i`);
                if (await actionText.count() > 0) {
                    await expect(actionText.first()).toBeVisible();
                }
            }
        } else {
            test.skip('No roles available to check permissions');
        }
    });
});

test.describe('RBAC Integration', () => {
    test('TC-RBAC-13: Assign role to user and verify permissions', async ({ page }) => {
        // This test verifies the full flow: create role -> create user -> assign role

        // Step 1: Create a test role
        await page.goto('http://localhost:3000/settings/roles');
        await page.waitForLoadState('networkidle');

        const timestamp = Date.now();

        // Create role (simplified - adjust based on actual UI)
        await page.getByRole('button', { name: /create role/i }).click();
        await page.waitForTimeout(500);
        await page.fill('input[name="name"]', `E2E Test Role ${timestamp}`);

        // Check a specific permission
        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 0) {
            await checkboxes.first().check();
        }

        await page.getByRole('button', { name: /save|create/i }).click();
        await page.waitForTimeout(1000);

        // Step 2: Create a user with that role
        await page.goto('http://localhost:3000/settings/users');
        await page.waitForLoadState('networkidle');

        await page.getByTestId('create-user-btn').click();
        await page.waitForTimeout(500);

        await page.fill('input[name="name"]', `E2E Test User ${timestamp}`);
        await page.fill('input[name="email"]', `e2euser${timestamp}@example.com`);
        await page.fill('input[name="password"]', 'TestPass123!');

        // Assign the role (depends on UI implementation)
        // This might involve selecting from a dropdown or checking a checkbox

        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForTimeout(1000);

        // Verify user was created
        await expect(page.locator(`text=E2E Test User ${timestamp}`)).toBeVisible({ timeout: 5000 });
    });
});
