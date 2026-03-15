import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/', { timeout: 15000 });
        await expect(page).toHaveURL(/\/$/);
    });

    test('TC-8.1: Analyze Dashboard Metrics', async ({ page }) => {
        await page.goto('/');

        // Wait for Loading to finish
        await expect(page.getByText('Loading Dashboard...')).not.toBeVisible({ timeout: 15000 });

        await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();

        // Check KPI
        await expect(page.getByText('Total Stock Value')).toBeVisible();
        await expect(page.getByText('Fulfillment Rate')).toBeVisible();

        // Check Chart
        await expect(page.getByText('Daily Sales Trend')).toBeVisible();
    });
});
