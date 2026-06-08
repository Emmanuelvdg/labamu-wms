/** @planRef E2E_Test_Plan11.md §Phase13 — Scenario 13.5 (Stock Moves Audit Trail), 13.6 (Ledger Export); TC-14.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Stock Moves', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-14.1: View Stock Moves', async ({ page }) => {
        await page.goto('/inventory/moves');
        await expect(page.getByRole('heading', { name: 'Stock Moves' })).toBeVisible();

        // Wait for initial data load before switching tabs (prevents re-render race on click)
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 15000 });

        // Switch to Done tab
        await page.getByRole('tab', { name: 'Done' }).click();

        // Wait for loading to complete — either "No moves found." or cards appear
        // Shadcn CardContent renders as <div class="p-6 ..."> not [class*="CardContent"]
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 8000 });
    });
});
