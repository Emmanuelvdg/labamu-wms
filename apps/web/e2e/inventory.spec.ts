import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-3.1: Create Product with Attributes', async ({ page }) => {
        await page.goto('/inventory');

        // Setup dialog/alert handler BEFORE any actions that might trigger it
        page.on('dialog', async dialog => {
            console.log('Alert received:', dialog.message());
            await dialog.accept();
        });

        // Click New Item button
        await page.getByTestId('new-item-btn').click();

        // Modal should be visible
        await expect(page.getByText('Add New Inventory Item')).toBeVisible();

        // Fill Form using test-ids
        const timestamp = Date.now();
        await page.getByTestId('product-sku-input').fill(`TEST-SKU-${timestamp}`);
        await page.getByTestId('product-name-input').fill('Test Product A');
        await page.getByTestId('product-category-input').fill('Electronics');

        // Submit
        await page.getByTestId('create-product-submit').click();

        // Wait for modal to disappear (indicates creation completed)
        await expect(page.getByText('Add New Inventory Item')).not.toBeVisible({ timeout: 5000 });

        // Additional wait for list to refresh
        await page.waitForTimeout(1000);

        // Verify product appears in table (not in the modal)
        const table = page.locator('table');
        await expect(table.getByText('Test Product A')).toBeVisible();
        await expect(table.getByText(`TEST-SKU-${timestamp}`)).toBeVisible();
    });

    test('TC-3.2: View Inventory Adjustments Page', async ({ page }) => {
        await page.goto('/inventory/adjustments');

        // Verify page loaded
        await expect(page.getByRole('heading', { name: 'Inventory Adjustments' })).toBeVisible();

        // Verify table structure exists (adjustments table)
        await expect(page.getByRole('table')).toBeVisible();

        // Verify table headers
        await expect(page.getByText('Product')).toBeVisible();
        await expect(page.getByText('Location')).toBeVisible();
        await expect(page.getByText('Current Qty')).toBeVisible();
        await expect(page.getByText('Counted Qty')).toBeVisible();
    });
});
