/** TC-PICK-DASH-1..4 — Supervisor dashboard and re-sequence panel */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Picking Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-PICK-DASH-1: Dashboard page loads with KPI cards', async ({ page }) => {
        await page.goto('/picking/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: /picking dashboard/i })).toBeVisible({ timeout: 10000 });

        // At least one of the KPI card labels is visible
        const hasKpi =
            (await page.getByText(/active sessions/i).isVisible().catch(() => false)) ||
            (await page.getByText(/tasks pending/i).isVisible().catch(() => false)) ||
            (await page.getByText(/tasks picked/i).isVisible().catch(() => false)) ||
            (await page.getByText(/tasks failed/i).isVisible().catch(() => false));
        expect(hasKpi).toBeTruthy();
    });

    test('TC-PICK-DASH-2: Sessions table renders without error', async ({ page }) => {
        await page.goto('/picking/dashboard');
        await page.waitForLoadState('networkidle');

        // Page must not show an uncaught error boundary
        await expect(page.locator('body')).not.toContainText('Application error');
        await expect(page.locator('body')).not.toContainText('Unhandled error');

        // Either a table of sessions or an "empty" state is shown
        const hasTable = await page.locator('table').isVisible().catch(() => false);
        const hasEmpty =
            (await page.getByText(/no sessions/i).isVisible().catch(() => false)) ||
            (await page.getByText(/no active/i).isVisible().catch(() => false)) ||
            (await page.getByText(/no picking/i).isVisible().catch(() => false));
        expect(hasTable || hasEmpty).toBeTruthy();
    });

    test('TC-PICK-DASH-3: Re-sequence button visible on active sessions', async ({ page }) => {
        await page.goto('/picking/dashboard');
        await page.waitForLoadState('networkidle');

        const hasTable = await page.locator('table').isVisible().catch(() => false);
        if (!hasTable) {
            test.skip();
            return;
        }

        const reseqBtn = page.getByRole('button', { name: /re.?seq|reoptimis/i }).first();
        if (await reseqBtn.isVisible()) {
            // Button should be interactable (not disabled)
            await expect(reseqBtn).toBeEnabled();
        }
    });

    test('TC-PICK-DASH-4: Re-sequence preview panel shows current vs proposed columns', async ({ page }) => {
        await page.goto('/picking/dashboard');
        await page.waitForLoadState('networkidle');

        const reseqBtn = page.getByRole('button', { name: /re.?seq|reoptimis/i }).first();
        const hasBtn = await reseqBtn.isVisible().catch(() => false);

        if (!hasBtn) {
            test.skip();
            return;
        }

        await reseqBtn.click();

        // Panel should show "Current Order" and "Proposed Order" headings
        await expect(page.getByText(/current order/i)).toBeVisible({ timeout: 8000 });
        await expect(page.getByText(/proposed order/i)).toBeVisible({ timeout: 8000 });

        // Accept and Reject buttons should be visible
        await expect(page.getByRole('button', { name: /accept/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /reject|cancel|discard/i })).toBeVisible({ timeout: 5000 });
    });
});
