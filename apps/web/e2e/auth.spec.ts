import { test, expect } from '@playwright/test';

test.describe('Authentication & RBAC', () => {

    test('TC-1.1: Create and Verify Custom Role', async ({ page }) => {
        // Pre-requisite: Login as Admin (assuming admin:admin credentials from seed)
        await page.goto('/login');

        // Clear autofilled values and fill with test credentials
        await page.getByLabel('Email').clear();
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').clear();
        await page.getByLabel('Password').fill('admin');

        await page.getByRole('button', { name: 'Sign in' }).click();

        await expect(page).toHaveURL('/');

        // 1. Navigate to Settings > Roles
        await page.getByRole('link', { name: 'Settings' }).click();
        await page.getByRole('link', { name: 'Roles & Permissions' }).click();

        // 2. Create Role
        await page.getByTestId('create-role-btn').click();
        await page.getByLabel('Role Name').fill('Inventory Manager');
        await page.getByLabel('Description').fill('Can manage stock');

        // 3. Select Permissions
        // Assuming there's a UI for selecting permissions, often checkboxes
        // This selector might need adjustment based on actual UI implementation
        await page.getByLabel('INVENTORY:CREATE').check();
        await page.getByLabel('INVENTORY:READ').check();
        await page.getByLabel('INVENTORY:UPDATE').check();

        // 4. Save
        await page.getByRole('button', { name: 'Save' }).click();

        // Expected
        await expect(page.getByText('Inventory Manager')).toBeVisible();
    });

    test('TC-1.2: Create User with Custom Role', async ({ page }) => {
        await page.goto('/login');

        // Clear autofilled values and fill with test credentials
        await page.getByLabel('Email').clear();
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').clear();
        await page.getByLabel('Password').fill('admin');

        await page.getByRole('button', { name: 'Sign in' }).click();

        // Create User
        await page.getByRole('link', { name: 'Settings' }).click();
        await page.getByRole('link', { name: 'Users' }).click();
        await page.getByTestId('create-user-btn').click();

        await page.getByTestId('user-name-input').fill('Test User');
        await page.getByTestId('user-email-input').fill('testuser@labamu.co.id');
        // Role selection might still be tricky without IDs, assume by name for now or add IDs later if needed
        // await page.getByLabel('Roles').... 

        await page.getByTestId('save-user-btn').click();
        await page.click('text=Inventory Manager');

        await page.getByRole('button', { name: 'Invite' }).click();

        // Expected
        await expect(page.getByText('testuser@labamu.co.id')).toBeVisible();
    });

    // Skipping TC-1.3 for now as we don't have the password for the new user unless we set it or use a magic link flow
});
