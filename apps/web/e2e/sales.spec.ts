import { test, expect } from '@playwright/test';

test.describe('Sales & Picking', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
    });

    test('TC-5.1: Define Picking Strategy', async ({ page }) => {
        await page.getByRole('link', { name: 'Warehouses' }).click();

        await page.getByText('E2E Warehouse').click();
        await page.getByRole('tab', { name: 'Strategies' }).click();

        await page.click('text=Removal Strategy');
        await page.click('text=FEFO');

        await page.getByRole('button', { name: 'Save' }).click();
    });

    test('TC-5.2: Create Sales Order and Pick', async ({ page }) => {
        // 1. Create Sales Order
        await page.getByRole('link', { name: 'Orders', exact: true }).click();

        await page.getByTestId('create-order-btn').click();

        // 2. Select Customer (Use Select Option)
        // Selecting by index for reliability in test data
        await page.getByTestId('order-customer-select').selectOption({ index: 1 });

        // 3. Add Item 
        // Default item row is 0
        // Wait for product select to be visible to ensure form is ready
        await expect(page.getByTestId('order-item-product-select-0')).toBeVisible();
        await page.getByTestId('order-item-product-select-0').selectOption({ index: 1 }); // Select first product
        await page.getByTestId('order-item-quantity-input-0').fill('10');

        await page.getByTestId('submit-order-btn').click();

        // Wait for redirect to /orders
        await expect(page).toHaveURL('/orders');

        // Click the first order in the list (most recent)
        // Wait for table to load
        await page.locator('tbody tr').first().waitFor();
        await page.locator('tbody tr').first().dblclick();

        // 2. Check Availability
        await page.getByRole('button', { name: 'Check Availability' }).click();
        // UI displays status in a badge without "Status: " prefix
        await expect(page.getByText('RESERVED', { exact: true })).toBeVisible();

        // 3. Picking Task
        // Navigate via UI or link from Order
        await page.getByRole('link', { name: 'Operations' }).click();
        await page.getByRole('link', { name: 'Picking' }).click();

        // Open the most recent task
        await page.locator('tr').first().click(); // Simplified selector

        // Validate Pick
        await page.getByRole('button', { name: 'Validate Pick' }).click();

        await expect(page.getByText('Status: DONE')).toBeVisible();
    });
});
