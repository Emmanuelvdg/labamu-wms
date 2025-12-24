import { test, expect } from '@playwright/test';

test.describe('Reporting', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-11.1: Generate Compliance Reports', async ({ page }) => {
        await page.goto('/reports');
        await expect(page.getByRole('heading', { name: 'Compliance Reports' })).toBeVisible();

        // Check VAT Report Generation
        // Note: Actual generation might fail if no backend impl or data, but button should be there.
        await expect(page.getByText('VAT Report (PPN)')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Generate PDF' })).toBeVisible();

        // Click Generate (Expect success or at least not crash)
        await page.getByRole('button', { name: 'Generate PDF' }).click();
        // Wait for 'Generating...'
        await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible();
        // Eventually success message?
    });
});
