import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Cycle Time Reporting', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Scenario 6.4: Cycle Time Report Loads', async ({ page }) => {
        await page.goto('/reporting/cycle-time');
        await expect(page.getByRole('heading', { name: 'Cycle Time Trend' })).toBeVisible({ timeout: 10000 });

        // Verify common elements like charts or filters
        await expect(page.getByText('Average Cycle Time (Hours)')).toBeVisible();
    });
});
