import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Returns Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-RET-1: Returns list page loads with correct heading and action button', async ({ page }) => {
        await page.goto('/returns');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Returns Management' })).toBeVisible({ timeout: 10000 });

        // "New Return Request" link/button should be present
        const newReturnBtn = page.getByRole('link', { name: /New Return Request/i })
            .or(page.getByRole('button', { name: /New Return Request/i }));
        await expect(newReturnBtn).toBeVisible();
    });

    test('TC-RET-2: Returns list table has the correct columns', async ({ page }) => {
        await page.goto('/returns');
        await page.waitForLoadState('networkidle');

        // Verify table structure
        await expect(page.getByText('Return ID')).toBeVisible();
        await expect(page.getByText('Original Order')).toBeVisible();
        await expect(page.getByText('Status')).toBeVisible();
        await expect(page.getByText('Date')).toBeVisible();
        await expect(page.getByText('Items')).toBeVisible();
    });

    test('TC-RET-3: Empty state message shown when no active returns', async ({ page }) => {
        await page.goto('/returns');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('table tbody tr');
        const count = await rows.count();

        if (count === 0 || await rows.first().locator('td[colspan]').isVisible()) {
            await expect(page.getByText(/No active returns/i)).toBeVisible();
        }
    });

    test('TC-RET-4: New Return page loads with order selector', async ({ page }) => {
        await page.goto('/returns/new');
        await page.waitForLoadState('networkidle');

        // The new return form should have an order selector
        const orderSelect = page.locator('select').first()
            .or(page.getByLabel(/Order/i));
        await expect(orderSelect).toBeVisible({ timeout: 10000 });
    });

    test('TC-RET-5: Submit empty return form shows validation', async ({ page }) => {
        await page.goto('/returns/new');
        await page.waitForLoadState('networkidle');

        page.on('dialog', async dialog => {
            // Accept any alert (validation message)
            await dialog.accept();
        });

        // Try to submit without selecting items
        const submitBtn = page.getByRole('button', { name: /Submit Return|Create Return/i });
        if (await submitBtn.isVisible()) {
            await submitBtn.click();

            // Should still be on the return form or show an error
            await page.waitForTimeout(1000);
            await expect(page).toHaveURL(/\/returns\/new/);
        }
    });

    test('TC-RET-6: New Return form - selecting a shipped order shows return items', async ({ page }) => {
        await page.goto('/returns/new');
        await page.waitForLoadState('networkidle');

        const orderSelect = page.locator('select').first();
        await expect(orderSelect).toBeVisible({ timeout: 10000 });

        const options = await orderSelect.locator('option').all();

        // Find a non-placeholder option
        for (const option of options) {
            const val = await option.getAttribute('value');
            if (val && val !== '') {
                await orderSelect.selectOption(val);
                await page.waitForLoadState('networkidle');

                // Items from the selected order should appear
                const itemRows = page.locator('table tbody tr').or(page.locator('[data-testid="return-item"]'));
                const hasItems = await itemRows.count() > 0;

                if (hasItems) {
                    // Should show quantity and reason inputs for items
                    const qtyInput = page.locator('input[type="number"]').first();
                    await expect(qtyInput).toBeVisible({ timeout: 5000 });
                }
                break;
            }
        }
    });
});
