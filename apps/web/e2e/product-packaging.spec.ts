import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Product Packaging UI', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should allow creating a Pallet packaging with Ti-Hi', async ({ page }) => {
        // Navigate to inventory and find E2E Test Product
        await page.goto('/inventory');
        await page.waitForLoadState('networkidle');

        // Search for the test product
        const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill('E2E Test Product');
            await page.waitForTimeout(1000);
        }

        // Click into the product row
        const productRow = page.locator('tr', { hasText: 'E2E Test Product' });
        const hasProduct = await productRow.isVisible({ timeout: 3000 }).catch(() => false);
        if (!hasProduct) {
            console.log('⚠ E2E Test Product not found, skipping packaging test');
            test.skip();
            return;
        }

        await productRow.getByRole('link').click();
        await page.waitForLoadState('networkidle');

        // Navigate to Packaging
        await page.getByRole('button', { name: 'Manage Packaging' }).click();
        await expect(page.locator('h1', { hasText: 'Manage Packaging Units' })).toBeVisible();

        // Fill in New Unit Form
        await page.fill('input[placeholder="e.g. Box of 12"]', 'E2E Pallet');

        // Select Type = PALLET from combobox
        await page.getByRole('combobox').first().click({ force: true });
        await page.getByRole('option', { name: 'Pallet' }).click();

        // Verify Ti-Hi inputs appear
        await expect(page.locator('text=Ti (Cartons/Layer)')).toBeVisible();
        await expect(page.locator('text=Hi (Layers)')).toBeVisible();

        // Fill Ti and Hi
        await page.locator('input[placeholder*="10"]').fill('10');
        await page.locator('input[placeholder*="5"]').fill('5');

        // Submit
        await page.getByRole('button', { name: 'Add Unit' }).click();

        // Verify it appears in the list
        await expect(page.locator('text=E2E Pallet')).toBeVisible();
    });
});
