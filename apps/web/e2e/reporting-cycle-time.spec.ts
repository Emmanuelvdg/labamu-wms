import { test, expect } from '@playwright/test';

test.describe('Cycle Time Reporting', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/', { timeout: 15000 });
        await expect(page).toHaveURL(/\/$/);
    });

    test('Scenario 6.4: Cycle Time Report Loads', async ({ page }) => {
        await page.goto('/reporting/cycle-time');
        await expect(page.getByRole('heading', { name: 'Cycle Time Trend' })).toBeVisible({ timeout: 10000 });

        // Verify common elements like charts or filters
        await expect(page.getByText('Average Cycle Time (Hours)')).toBeVisible();
    });
});
