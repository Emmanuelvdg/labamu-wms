import { test, expect } from '@playwright/test';

test.describe('Inter-Warehouse Transfer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
    });

    test('TC-6.1: Full IWT Flow', async ({ page }) => {
        // 1. Create Transfer
        await page.getByRole('link', { name: 'Stock Transfers' }).click();

        await page.getByRole('button', { name: 'New Transfer' }).click();

        await page.click('text=Source Warehouse');
        await page.click('text=Central DC');

        await page.click('text=Destination Warehouse');
        // Assuming we created a second warehouse in setup or this test creates it (skipped for brevity)
        // Let's assume 'Retail Store' exists
        await page.click('text=Retail Store');

        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.click('text=Select Product');
        await page.click('text=Premium Widget');
        await page.getByLabel('Quantity').fill('20');

        await page.getByRole('button', { name: 'Confirm' }).click();

        // 2. Pick & Ship (Outbound)
        await page.getByRole('button', { name: 'Pick & Ship' }).click();
        // Confirm modal/action
        await page.getByRole('button', { name: 'Validate' }).click();

        await expect(page.getByText('Status: IN_TRANSIT')).toBeVisible();

        // 3. Receive (Inbound)
        await page.getByRole('button', { name: 'Receive' }).click();
        await page.getByLabel('Received Quantity').fill('20');
        await page.getByRole('button', { name: 'Validate' }).click();

        await expect(page.getByText('Status: DONE')).toBeVisible();
    });
});
