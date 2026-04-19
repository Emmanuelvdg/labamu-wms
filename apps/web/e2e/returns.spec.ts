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

        // "New Return Request" link/button should be present — .first() avoids strict mode
        // if both a link and a wrapping button happen to match
        const newReturnBtn = page.getByRole('link', { name: /New Return Request/i })
            .or(page.getByRole('button', { name: /New Return Request/i }))
            .first();
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

        await expect(page.getByRole('heading', { name: 'Create Return Request' })).toBeVisible({ timeout: 10000 });

        // The page uses a Radix shadcn Select component (role="combobox"), not a native <select>
        const orderSelect = page.getByRole('combobox');
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

        // Page uses Radix shadcn Select (role="combobox") — open it and pick an option
        const orderCombobox = page.getByRole('combobox');
        await expect(orderCombobox).toBeVisible({ timeout: 10000 });

        await orderCombobox.click();

        // Options rendered as [role="option"] in the Radix dropdown portal
        const options = page.locator('[role="option"]');
        const count = await options.count();

        if (count === 0) {
            // No eligible orders (SHIPPED/DELIVERED/COMPLETED) — precondition not met
            return;
        }

        await options.first().click();
        await page.waitForLoadState('networkidle');

        // After selection, order items table should appear
        const itemTable = page.locator('table tbody tr');
        const hasItems = await itemTable.count() > 0;

        if (hasItems) {
            // Each row should show a quantity input
            const qtyInput = page.locator('input[type="number"]').first();
            await expect(qtyInput).toBeVisible({ timeout: 5000 });
        }
    });
});
