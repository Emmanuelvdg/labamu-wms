/** @planRef E2E_Test_Plan11.md §Phase2 — Scenario 2.3 (Create Suppliers); TC-9.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Supplier Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-9.1: Create Supplier', async ({ page }) => {
        await page.goto('/inventory/suppliers');

        // Open Modal — rendered as a plain div overlay (no dialog role)
        await page.getByTestId('add-supplier-btn').click();
        await expect(page.getByText('Add New Supplier')).toBeVisible();

        // Fill Form — only 'name' is required; email/phone/address are optional
        const supplierName = `Test Supplier ${Date.now()}`;
        await page.getByTestId('supplier-name-input').fill(supplierName);

        // Submit
        await page.getByTestId('create-supplier-submit').click();

        // Verify modal closes and new entry appears in the table
        await expect(page.getByText('Add New Supplier')).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('table')).toContainText(supplierName, { timeout: 10000 });
    });
});
