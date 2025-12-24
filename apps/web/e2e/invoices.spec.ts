import { test, expect } from '@playwright/test';

test.describe('Invoicing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-12.1: View Invoices', async ({ page }) => {
        await page.goto('/invoices');
        await expect(page.getByRole('heading', { name: 'Vendor Invoices' })).toBeVisible();

        // Check for 'New Invoice' button only if permission (Admin likely has it)
        // Check for table
        await expect(page.locator('table')).toBeVisible();
    });

    // Note: Creating invoice might require Vendor, etc. For now, View is sanity.
});
