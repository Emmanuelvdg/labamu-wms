import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
    });

    test('TC-3.1: Create Product with Attributes', async ({ page }) => {
        await page.getByRole('link', { name: 'Inventory', exact: true }).click();
        await page.getByTestId('new-item-btn').click();

        // Fill Form using test-ids
        await page.getByTestId('product-sku-input').fill('TEST-SKU-001');
        await page.getByTestId('product-name-input').fill('Test Product A');
        await page.getByTestId('product-category-input').fill('Electronics');

        await page.getByTestId('create-product-submit').click();

        // Verify
        await expect(page.getByText('Test Product A')).toBeVisible();
        await expect(page.getByText('TEST-SKU-001')).toBeVisible();
    });

    test('TC-3.2: Adjust Inventory (Initial Stock)', async ({ page }) => {
        await page.getByRole('link', { name: 'Inventory' }).click();
        await page.getByRole('link', { name: 'Adjustments' }).click();

        await page.getByRole('button', { name: 'New Adjustment' }).click();

        // Fill form
        // Selecting location might be a modal or dropdown
        await page.click('text=Select Location');
        await page.getByPlaceholder('Search').fill('Shelf A');
        await page.click('text=Shelf A');

        // Select Product
        await page.click('text=Select Product');
        await page.getByPlaceholder('Search').fill('Premium Widget');
        await page.click('text=Premium Widget');

        // Batch Info
        await page.getByLabel('Batch Number').fill('BATCH-001');
        await page.getByLabel('Expiry Date').fill('2026-01-01');

        await page.getByLabel('Quantity Change').fill('100');
        await page.getByLabel('Reason').fill('Initial Load');

        await page.getByRole('button', { name: 'Apply Adjustment' }).click();

        // Verify
        await expect(page.getByText('Successfully adjusted inventory')).toBeVisible();
    });
});
