import { test, expect } from '@playwright/test';

test.describe('Stock Moves', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-14.1: View Stock Moves', async ({ page }) => {
        await page.goto('/inventory/moves');
        await expect(page.getByRole('heading', { name: 'Stock Moves' })).toBeVisible();

        // Switch Tabs
        await page.getByRole('tab', { name: 'Done' }).click();

        // Verify Content (Might be empty, but verify no error)
        // If empty, it shows "No moves found."
        const emptyState = page.getByText('No moves found.');
        const table = page.locator('.card'); // Cards are used

        await expect(emptyState.or(table.first())).toBeVisible();
    });
});
