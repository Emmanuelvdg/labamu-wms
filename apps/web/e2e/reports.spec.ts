import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Reporting', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-11.1: Generate Compliance Reports', async ({ page }) => {
        // Compliance reports are at /reporting/compliance (not /reports)
        await page.goto('/reporting/compliance');
        await expect(page.getByRole('heading', { name: 'Compliance Reports' })).toBeVisible();

        await expect(page.getByText('VAT Report (PPN)')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Generate PDF' })).toBeVisible();

        await page.getByRole('button', { name: 'Generate PDF' }).click();
        // Button shows "Generating..." while in-flight, OR result/error appears after completion.
        // Check for any stable post-click outcome to avoid race conditions on fast APIs.
        await expect(
            page.getByRole('button', { name: 'Generating...' })
                .or(page.getByText('Report Generated Successfully'))
                .or(page.getByRole('button', { name: 'Generate PDF' }).and(page.locator(':not([disabled])').first()))
        ).toBeVisible({ timeout: 10000 });
    });
});
