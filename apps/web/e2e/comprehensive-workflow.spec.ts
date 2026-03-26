import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Workflow Test
 * Covers: Purchasing -> Receiving -> Putaway -> Sales -> Picking -> Packing -> Shipping
 */

test.describe('Full IMS Lifecycle: Purchase to Ship', () => {

    test.beforeEach(async ({ page }) => {
        // 0. Login as Admin
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('Full Workflow Scenario', async ({ page }) => {
        // --- DATA SETUP (Ensure entities exist) ---
        
        // 1. Ensure Product "Pro Laptop X" exists
        await page.goto('/inventory');
        const hasProduct = await page.getByText('Pro Laptop X').isVisible();
        if (!hasProduct) {
            await page.getByTestId('new-item-btn').click();
            await page.getByTestId('product-sku-input').fill('PRO-LAP-X');
            await page.getByTestId('product-name-input').fill('Pro Laptop X');
            await page.getByTestId('product-category-input').fill('Electronics');
            await page.getByTestId('create-product-submit').click();
            await expect(page.getByText('Pro Laptop X')).toBeVisible();
        }

        // 2. Ensure Supplier "PT TechSupplier" exists
        await page.goto('/inventory/suppliers');
        const hasSupplier = await page.getByText('PT TechSupplier').isVisible();
        if (!hasSupplier) {
            await page.getByTestId('add-supplier-btn').click();
            await page.getByTestId('supplier-name-input').fill('PT TechSupplier');
            await page.getByLabel('Contact Info').fill('tech@supplier.com');
            await page.getByTestId('create-supplier-submit').click();
            await expect(page.getByText('PT TechSupplier')).toBeVisible();
        }

        // 3. Ensure Customer "CV Gadget Store" exists
        await page.goto('/customers');
        const hasCustomer = await page.getByText('CV Gadget Store').isVisible();
        if (!hasCustomer) {
            await page.getByRole('button', { name: 'New Customer' }).click();
            await page.getByLabel('Customer Name').fill('CV Gadget Store');
            await page.getByLabel('Email').fill('cv@gadget.com');
            await page.getByRole('button', { name: 'Save' }).click();
            await expect(page.getByText('CV Gadget Store')).toBeVisible();
        }

        // --- STEP 1: PURCHASING ---
        await page.goto('/purchase-orders');
        await page.getByRole('button', { name: 'New PO' }).click();
        
        // Select Supplier
        await page.click('text=Select Supplier');
        await page.click('text=PT TechSupplier');
        
        // Add Item
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.click('text=Select Product');
        await page.click('text=Pro Laptop X');
        await page.getByLabel('Quantity').fill('20');
        await page.getByLabel('Unit Cost').fill('1500'); // Example cost
        
        await page.getByRole('button', { name: 'Confirm Order' }).click();
        await expect(page.getByText('Status: ORDERED')).toBeVisible();
        const poNumber = await page.locator('h1').innerText(); // Capture for later if needed

        // --- STEP 2: RECEIVING ---
        await page.getByRole('button', { name: 'Receive Products' }).click();
        await page.getByLabel('Received Quantity').fill('20');
        await page.click('text=Select Destination');
        await page.click('text=Receiving Dock'); // Assuming it exists
        await page.getByRole('button', { name: 'Validate Receipt' }).click();
        await expect(page.getByText('Status: RECEIVED')).toBeVisible();

        // --- STEP 3: PUTAWAY ---
        await page.goto('/putaway');
        await page.locator('select').selectOption({ label: /Main Warehouse/ });
        await page.locator('button', { hasText: 'Start Putaway Session' }).click();
        
        // Find the task for Pro Laptop X
        await expect(page.locator('text=Pro Laptop X')).toBeVisible();
        await page.locator('button', { hasText: 'Start' }).first().click();
        await page.locator('button', { hasText: 'Confirm' }).first().click();
        await expect(page.locator('text=Done')).toBeVisible();

        // --- STEP 4: SALES & ORDER MANAGEMENT ---
        await page.goto('/orders');
        await page.getByRole('button', { name: 'New Order' }).click();
        
        // Select Customer
        await page.getByTestId('order-customer-select').selectOption({ label: /CV Gadget Store/ });
        // Select Delivery Method
        await page.getByTestId('order-delivery-method-select').selectOption({ index: 1 });
        
        // Add Item
        await page.getByTestId('order-item-product-select-0').selectOption({ label: /Pro Laptop X/ });
        await page.getByTestId('order-item-quantity-input-0').fill('15');
        
        await page.getByTestId('submit-order-btn').click();
        await page.waitForURL('**/orders');
        
        // Confirm & Allocate
        await page.locator('table tbody tr').first().click();
        await page.getByRole('button', { name: 'Check Availability' }).click();
        await expect(page.getByText('RESERVED')).toBeVisible();

        // --- STEP 5: PICKING ---
        await page.goto('/picking');
        await page.locator('button', { hasText: 'Start Picking' }).click();
        // Assuming the first task is ours
        await page.locator('button', { hasText: 'Start' }).first().click();
        await page.locator('button', { hasText: 'Confirm' }).first().click();
        await expect(page.getByText('Status: PICKED')).toBeVisible();

        // --- STEP 6: PACKING & SHIPPING ---
        await page.goto('/packing');
        await page.locator('button', { hasText: 'Pack' }).first().click();
        
        // Pack items into parcel
        await page.getByRole('button', { name: 'Add Parcel' }).click();
        await page.getByRole('button', { name: 'Confirm Packing' }).click();
        await expect(page.getByText('Status: PACKED')).toBeVisible();

        // Ship
        await page.goto('/shipments');
        await page.locator('button', { hasText: 'Ship' }).first().click();
        await expect(page.getByText('Status: SHIPPED')).toBeVisible();

        // --- POST-CONDITIONS & VALIDATION ---
        
        // 1. Inventory Counts
        await page.goto('/inventory');
        const availableQty = await page.locator('tr:has-text("Pro Laptop X") td:has-text("5")');
        await expect(availableQty).toBeVisible();

        // 2. Dashbard Metrics
        await page.goto('/');
        await expect(page.locator('text=Stock Value')).toBeVisible();
        await expect(page.locator('text=Orders Shipped')).toBeVisible();
    });
});
