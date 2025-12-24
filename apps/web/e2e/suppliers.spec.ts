import { test, expect } from '@playwright/test';

test.describe('Supplier Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-9.1: Create Supplier', async ({ page }) => {
        await page.goto('/inventory/suppliers');

        // Open Dialog
        await page.getByTestId('add-supplier-btn').click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill Form
        const supplierName = `Test Supplier ${Date.now()}`;
        await page.getByTestId('supplier-name-input').fill(supplierName);

        // Use Label text to find sibling input if testid missing
        await page.getByLabel('Contact Info').fill('contact@test.com');

        // Submit
        await page.getByTestId('create-supplier-submit').click();

        // Verify Toast and List Update
        await expect(page.getByRole('table')).toContainText(supplierName);
        await expect(page.getByRole('table')).toContainText('contact@test.com');
    });
});
