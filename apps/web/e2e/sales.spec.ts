import { test, expect } from '@playwright/test';

test.describe('Sales & Exceptions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/', { timeout: 15000 });
        await expect(page).toHaveURL(/\/$/);
    });

    test('Scenario 5.1: Cancel Pending Order', async ({ page }) => {
        // Handle "Order created successfully" alert
        page.on('dialog', async dialog => {
            if (dialog.message().includes('Order created successfully')) {
                await dialog.accept();
            }
        });

        // 1. Create Sales Order
        await page.goto('/orders');
        await page.getByRole('button', { name: 'New Order' }).click();

        // 2. Select Customer
        await page.getByTestId('order-customer-select').selectOption({ index: 1 });

        // 3. Select Delivery Method (Required for Sales)
        await page.getByTestId('order-delivery-method-select').selectOption({ index: 1 });

        // 4. Add Item
        await page.getByTestId('order-item-product-select-0').selectOption({ index: 1 });
        await page.getByTestId('order-item-quantity-input-0').fill('2');

        // 5. Submit
        await page.getByTestId('submit-order-btn').click();

        // 6. Wait for redirect back to /orders list
        await page.waitForURL('**/orders', { timeout: 15000 });

        // 7. Click the first order in the table (should be the one we just created)
        // Wait for table to load
        await page.locator('table tbody tr').first().waitFor({ state: 'visible' });
        await page.locator('table tbody tr').first().click();

        // 8. Confirm & Allocate (Transition to RESERVED)
        // Check for "Check Availability" (Role button with name)
        const allocateBtn = page.getByRole('button', { name: 'Check Availability' });
        await allocateBtn.waitFor({ state: 'visible', timeout: 10000 });
        await allocateBtn.click();

        // Wait for status update
        await expect(page.getByText('RESERVED')).toBeVisible({ timeout: 10000 });

        // 9. Cancel Order
        await page.getByRole('button', { name: 'Cancel Order' }).click();

        // 10. Confirm Dialog
        const confirmBtn = page.getByRole('button', { name: /Yes, Cancel Order|Confirm/ });
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click();

        // 11. Verify Cancelled Status
        await expect(page.getByText('CANCELLED')).toBeVisible({ timeout: 10000 });
    });
});
