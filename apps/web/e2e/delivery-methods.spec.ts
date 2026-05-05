/** @planRef E2E_Test_Plan11.md §Phase8 — Scenario 8.1 (Lalamove Live Quote / Delivery Methods); TC-16.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Delivery Methods', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-16.1: Create Delivery Method', async ({ page }) => {
        await page.goto('/configuration/delivery-methods');

        // Open Modal
        await page.getByRole('button', { name: '+ Create Method' }).click();
        await expect(page.getByRole('heading', { name: 'New Delivery Method' })).toBeVisible();

        // Fill Form
        const methodName = `Express ${Date.now()}`;
        await page.locator('input[type="text"]').first().fill(methodName);

        // Select Provider (Default Fixed Price)
        await page.locator('input[type="number"]').first().fill('15.50');

        // Save
        await page.getByRole('button', { name: 'Save Method' }).click();

        // Verify List
        await expect(page.getByRole('table')).toContainText(methodName);
        await expect(page.getByRole('table')).toContainText('$15.5');
    });
});
