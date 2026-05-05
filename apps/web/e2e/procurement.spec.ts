/** @planRef E2E_Test_Plan11.md §Phase3 — Scenarios 3.1 (Create & Confirm PO), 3.2 (Receive Goods); TC-4.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Procurement', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-4.1: View Purchase Orders and Navigate to Create', async ({ page }) => {
        // Navigate directly — sidebar link "Purchase Orders" goes to /inventory/purchases
        await page.goto('/inventory/purchases');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();

        // "Create Purchase Order" is a Link that navigates to /inventory/purchases/new
        const createLink = page.getByRole('link', { name: 'Create Purchase Order' });
        await expect(createLink).toBeVisible();

        await createLink.click();
        await expect(page).toHaveURL(/\/inventory\/purchases\/new/, { timeout: 5000 });
    });
});
