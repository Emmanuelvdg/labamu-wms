import { test, expect } from '@playwright/test';

test.describe('Procurement', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
    });

    test('TC-4.1: Create & Receive Purchase Order', async ({ page }) => {
        // 1. Navigate to Procurement
        await page.getByRole('link', { name: 'Purchase Orders' }).click();

        await page.getByRole('button', { name: 'New PO' }).click();

        // Select Supplier
        await page.click('text=Select Supplier');
        await page.click('text=Acme Corp'); // Assuming pre-seeded or created dynamically

        // Add Item
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.click('text=Select Product');
        await page.click('text=Premium Widget');
        await page.getByLabel('Quantity').fill('50');
        await page.getByLabel('Unit Cost').fill('10');

        await page.getByRole('button', { name: 'Confirm Order' }).click();

        await expect(page.getByText('Status: ORDERED')).toBeVisible();

        // 2. Receive Items
        await page.getByRole('button', { name: 'Receive Products' }).click();

        await page.getByLabel('Received Quantity').fill('50');
        await page.click('text=Select Destination');
        await page.click('text=Central DC'); // Or Inbound Dock

        await page.getByRole('button', { name: 'Validate Receipt' }).click();

        await expect(page.getByText('Status: RECEIVED')).toBeVisible();
    });
});
