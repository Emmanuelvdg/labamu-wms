import { test, expect } from '@playwright/test';

test.describe('Settings Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-15.1: Navigate Settings Options', async ({ page }) => {
        await page.goto('/settings');

        // Verify Header
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Navigate to Picking Strategies
        await page.getByRole('button', { name: 'Picking Strategies' }).click();

        // Verify Content (Redirect message)
        await expect(page.getByText('Picking strategies are now configured per warehouse')).toBeVisible();

        // Navigate back to General (Placeholder)
        await page.getByRole('button', { name: 'General' }).click();
        await expect(page.getByText('This section is under development')).toBeVisible();
    });
});
