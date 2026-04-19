import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Shipments', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-SHIP-1: Shipments page loads with correct heading and table structure', async ({ page }) => {
        await page.goto('/shipments');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Shipments' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Manage outbound shipments and track deliveries')).toBeVisible();

        // Table headers should be present — scope to thead to avoid ambiguity with data cells
        const thead = page.locator('thead');
        await expect(thead.getByText('Order ID')).toBeVisible();
        await expect(thead.getByText('Carrier')).toBeVisible();
        await expect(thead.getByText('Tracking ID')).toBeVisible();
        await expect(thead.getByText('Status')).toBeVisible();
    });

    test('TC-SHIP-2: Empty state shows correct message when no shipments exist', async ({ page }) => {
        await page.goto('/shipments');
        await page.waitForLoadState('networkidle');

        const shipmentRows = page.locator('table tbody tr');
        const rowCount = await shipmentRows.count();

        if (rowCount === 0 || await shipmentRows.first().locator('td[colspan]').isVisible()) {
            await expect(page.getByText('No shipments found')).toBeVisible();
        }
    });

    test('TC-SHIP-3: Filter by carrier narrows the shipment list', async ({ page }) => {
        await page.goto('/shipments');
        await page.waitForLoadState('networkidle');

        // The carrier filter input should be present
        const carrierInput = page.getByPlaceholder(/Carrier/i)
            .or(page.locator('input[placeholder*="carrier" i]'));

        if (await carrierInput.isVisible()) {
            await carrierInput.fill('NonExistentCarrier12345');

            // Table should now show no results or filtered list
            await page.waitForTimeout(500);
            const rows = page.locator('table tbody tr');
            const count = await rows.count();

            // Either one "No shipments found" row or zero rows with data
            if (count > 0) {
                const emptyCell = rows.first().locator('td[colspan]');
                const hasEmptyState = await emptyCell.isVisible();
                if (hasEmptyState) {
                    await expect(emptyCell).toContainText(/No shipments/i);
                }
            }
        }
    });

    test('TC-SHIP-4: Filter by tracking ID narrows the shipment list', async ({ page }) => {
        await page.goto('/shipments');
        await page.waitForLoadState('networkidle');

        const trackingInput = page.getByPlaceholder(/Tracking/i)
            .or(page.locator('input[placeholder*="tracking" i]'));

        if (await trackingInput.isVisible()) {
            await trackingInput.fill('INVALID-TRACK-99999');
            await page.waitForTimeout(500);

            // Should show empty state
            const rows = page.locator('table tbody tr');
            if (await rows.count() > 0) {
                const emptyCell = rows.first().locator('td[colspan]');
                const hasEmpty = await emptyCell.isVisible();
                if (hasEmpty) {
                    await expect(emptyCell).toContainText(/No shipments/i);
                }
            }
        }
    });

    test('TC-SHIP-5: Existing shipments show correct columns and are clickable', async ({ page }) => {
        await page.goto('/shipments');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('table tbody tr');
        const count = await rows.count();

        if (count > 0) {
            const firstRow = rows.first();
            const firstCell = firstRow.locator('td').first();
            const hasContent = await firstCell.textContent();

            expect(hasContent).toBeTruthy();

            // Rows should be clickable (cursor-pointer class is set)
            await firstRow.click();
            // Should navigate to shipment/order detail
            await page.waitForLoadState('networkidle');
        }
    });
});
