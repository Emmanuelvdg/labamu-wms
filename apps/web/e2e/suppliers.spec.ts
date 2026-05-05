/** @planRef E2E_Test_Plan11.md §Phase2 — Scenario 2.3 (Create Suppliers); TC-9.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Supplier Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-9.1: Create Supplier', async ({ page }) => {
        await page.goto('/inventory/suppliers');

        // Open Dialog
        await page.getByTestId('add-supplier-btn').click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill Form
        const supplierName = `Test Supplier ${Date.now()}`;
        await page.getByTestId('supplier-name-input').fill(supplierName);

        // Use Label text to find sibling input if testid missing
        await page.getByLabel('Contact Info').fill('contact@test.com');

        // Submit
        await page.getByTestId('create-supplier-submit').click();

        // Verify Toast and List Update
        await expect(page.getByRole('table')).toContainText(supplierName);
        await expect(page.getByRole('table')).toContainText('contact@test.com');
    });
});
