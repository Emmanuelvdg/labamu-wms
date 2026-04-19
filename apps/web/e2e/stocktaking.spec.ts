import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Stocktaking & Cycle Counting', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-STOCK-1: Stocktaking list page loads with correct heading and action button', async ({ page }) => {
        await page.goto('/stocktaking');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Stocktaking & Cycle Counting' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Manage blind counts, cycle counts, and reconciliations')).toBeVisible();

        const newBtn = page.getByRole('link', { name: /New Cycle Count/i })
            .or(page.getByRole('button', { name: /New Cycle Count/i }))
            .first();
        await expect(newBtn).toBeVisible();
    });

    test('TC-STOCK-2: Stocktaking list table has correct columns', async ({ page }) => {
        await page.goto('/stocktaking');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Date')).toBeVisible();
        await expect(page.getByText('Type')).toBeVisible();
        await expect(page.getByText('Status')).toBeVisible();
        await expect(page.getByText('Description')).toBeVisible();
    });

    test('TC-STOCK-3: Empty state shown when no active sessions', async ({ page }) => {
        await page.goto('/stocktaking');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('table tbody tr');
        const count = await rows.count();

        if (count === 0 || await rows.first().locator('td[colspan]').isVisible()) {
            await expect(page.getByText(/No active sessions/i)).toBeVisible();
        }
    });

    test('TC-STOCK-4: New stocktake form has required fields', async ({ page }) => {
        await page.goto('/stocktaking/new');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Start New Stocktake' })).toBeVisible({ timeout: 10000 });

        // Warehouse selector
        const warehouseSelect = page.locator('select').first();
        await expect(warehouseSelect).toBeVisible();

        // Type selector (CYCLE_COUNT, FULL, SPOT_CHECK)
        const typeSelect = page.locator('select').nth(1);
        await expect(typeSelect).toBeVisible();

        // Description field — placeholder is "e.g. Weekly Cycle Count for Zone A"
        const descInput = page.getByPlaceholder(/Weekly Cycle Count/i)
            .or(page.getByPlaceholder(/e\.g\./i));
        await expect(descInput.first()).toBeVisible();
    });

    test('TC-STOCK-5: New stocktake form - type selector has all options', async ({ page }) => {
        await page.goto('/stocktaking/new');
        await page.waitForLoadState('networkidle');

        const typeSelect = page.locator('select').nth(1);
        await expect(typeSelect).toBeVisible({ timeout: 10000 });

        const options = await typeSelect.locator('option').allTextContents();
        const optionText = options.join(' ');

        // Should have at least Cycle Count and Full options
        expect(optionText).toContain('Cycle Count');
        expect(optionText).toContain('Full');
    });

    test('TC-STOCK-6: Creating a new cycle count session redirects to the list', async ({ page }) => {
        await page.goto('/stocktaking/new');
        await page.waitForLoadState('networkidle');

        page.on('dialog', async dialog => dialog.accept());

        // Select the first available warehouse
        const warehouseSelect = page.locator('select').first();
        const options = await warehouseSelect.locator('option').all();

        let warehouseSelected = false;
        for (const option of options) {
            const val = await option.getAttribute('value');
            if (val && val !== '') {
                await warehouseSelect.selectOption(val);
                warehouseSelected = true;
                break;
            }
        }

        if (!warehouseSelected) {
            test.skip(true, 'No warehouses available to create a stocktake session');
            return;
        }

        // Select Cycle Count type
        const typeSelect = page.locator('select').nth(1);
        await typeSelect.selectOption('CYCLE_COUNT');

        // Add a description
        const descInput = page.locator('input[placeholder*="ycle" i], input[placeholder*="escription" i], textarea').first();
        if (await descInput.isVisible()) {
            await descInput.fill(`E2E Cycle Count ${Date.now()}`);
        }

        // Submit
        await page.getByRole('button', { name: /Start|Create|Submit/i }).click();

        // Should redirect to the stocktaking list
        await page.waitForURL('**/stocktaking', { timeout: 15000 });
        await expect(page).toHaveURL(/\/stocktaking$/);
    });
});
