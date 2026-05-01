import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-8.1: Analyze Dashboard Metrics', async ({ page }) => {
        await page.goto('/');

        // Wait for Loading to finish
        await expect(page.getByText('Loading Dashboard...')).not.toBeVisible({ timeout: 20000 });
        // Extra settle time so async KPI cards fully render
        await page.waitForTimeout(2000);

        await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();

        // Check KPI
        await expect(page.getByText('Total Stock Value')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Fulfillment Rate')).toBeVisible({ timeout: 10000 });

        // Check Chart
        await expect(page.getByText('Daily Sales Trend')).toBeVisible();
    });
});
