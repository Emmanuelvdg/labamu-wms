import { test, expect } from '@playwright/test';

test.describe('Scrap Orders', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');

        // Ensure we have a product to scrap
        // Quick create or assume seed. Let's quick create via API or just UI if simple
        await page.goto('/inventory/products');
        await page.getByTestId('new-item-btn').click();
        await page.getByTestId('product-sku-input').fill(`SCRAP-SKU-${Date.now()}`);
        await page.getByTestId('product-name-input').fill(`Scrap Product ${Date.now()}`);
        await page.getByTestId('create-product-submit').click();
    });

    test('TC-5.1: Create Scrap Order', async ({ page }) => {
        await page.goto('/inventory/scrap');

        // Open Modal
        await page.getByRole('button', { name: 'New Scrap Order' }).click();
        await expect(page.getByRole('heading', { name: 'Scrap Inventory' })).toBeVisible();

        // Select Product (First one in list presumably the one we just created)
        await page.locator('text=Select product').click();
        await page.getByRole('option').first().click();

        // Select Location (Assume default exists or seed)
        await page.locator('text=Select location').click();
        await page.getByRole('option').first().click();

        // Details
        await page.locator('input[type="number"]').fill('5');
        await page.locator('input[placeholder="e.g. Damaged, Expired"]').fill('Damaged in transit');

        // Submit
        await page.getByRole('button', { name: 'Validate Scrap' }).click();

        // Verify List
        await expect(page.getByRole('table')).toContainText('Damaged in transit'); // Wait, reason is commented out in page.tsx table?
        // Let's verify Quantity -5
        await expect(page.getByRole('table')).toContainText('-5');
    });
});
