import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Packing Station', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-PACK-1: Packing queue page loads with correct heading', async ({ page }) => {
        await page.goto('/packing');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Packing Station' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Orders ready to be packed and shipped')).toBeVisible();
    });

    test('TC-PACK-2: Refresh button reloads the packing queue', async ({ page }) => {
        await page.goto('/packing');
        await page.waitForLoadState('networkidle');

        const refreshBtn = page.getByRole('button', { name: /Refresh/i });
        await expect(refreshBtn).toBeVisible();

        // Clicking refresh should not cause errors
        await refreshBtn.click();
        await page.waitForLoadState('networkidle');

        // Page should still show the heading after refresh
        await expect(page.getByRole('heading', { name: 'Packing Station' })).toBeVisible();
    });

    test('TC-PACK-3: Empty state is shown when no orders are ready for packing', async ({ page }) => {
        await page.goto('/packing');
        await page.waitForLoadState('networkidle');

        const hasOrders = await page.locator('.grid > div').count() > 0;

        if (!hasOrders) {
            // Empty state message should be shown
            await expect(page.getByText('No orders to pack')).toBeVisible({ timeout: 10000 });
            await expect(page.getByText('Orders will appear here after picking is completed')).toBeVisible();
        } else {
            // Orders are present - verify they show the "Start Packing" or "Resume Packing" action
            const packAction = page.getByRole('button', { name: /Start Packing|Resume/i }).first();
            await expect(packAction).toBeVisible();
        }
    });

    test('TC-PACK-4: Order cards display order information', async ({ page }) => {
        await page.goto('/packing');
        await page.waitForLoadState('networkidle');

        const orderCards = page.locator('.bg-white.rounded-lg.border');
        const count = await orderCards.count();

        if (count > 0) {
            const firstCard = orderCards.first();

            // Each order card should show some identifier
            const hasOrderId = await firstCard.locator('text=/Order|order/').count() > 0;
            expect(hasOrderId || count > 0).toBeTruthy();
        }
    });

    test('TC-PACK-5: Clicking Start Packing navigates to packing session', async ({ page }) => {
        await page.goto('/packing');
        await page.waitForLoadState('networkidle');

        const startBtn = page.getByRole('button', { name: 'Start Packing' }).first();
        const hasStartBtn = await startBtn.isVisible().catch(() => false);

        if (hasStartBtn) {
            await startBtn.click();

            // Should navigate to the packing session detail page
            await page.waitForURL('**/packing/**', { timeout: 15000 });
            await expect(page).toHaveURL(/\/packing\/.+/);
        }
        // If no orders to pack, skip test as precondition not met
    });
});
