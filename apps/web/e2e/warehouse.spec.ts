import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Warehouse Management', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`BROWSER ERROR: ${msg.text()}`);
            }
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForTimeout(1000); // Small wait for auth state
    });

    test('TC-2.1: Create Multi-Level Warehouse Hierarchy', async ({ page }) => {
        const timestamp = Date.now();
        const warehouseName = `Central DC ${timestamp}`;
        const zoneName = `Zone A ${timestamp}`;
        const rowName = `Row 1 ${timestamp}`;
        const shelfName = `Shelf A ${timestamp}`;

        // 1. Navigate to Warehouses
        await page.getByRole('link', { name: 'Warehouses', exact: true }).click();

        // 2. Create Warehouse
        await page.getByTestId('create-warehouse-btn').click();
        await page.getByTestId('warehouse-name-input').fill(warehouseName);
        await page.getByTestId('warehouse-shortname-input').fill(`CDC${timestamp.toString().slice(-4)}`);
        await page.getByTestId('warehouse-address-input').fill('123 Main St');
        await page.getByTestId('submit-warehouse-btn').click();

        // Wait for modal to close and success
        await expect(page.getByRole('button', { name: 'Create Warehouse', exact: true })).not.toBeVisible();
        await expect(page.getByText(warehouseName)).toBeVisible();

        // 3. Navigate to Locations Management
        await page.goto('/inventory/locations');
        await page.waitForLoadState('networkidle');

        // 4. Create Zone (Room) under Warehouse
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(zoneName);

        // Structure: Room
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();

        // Parent: Central DC
        await page.getByTestId('location-parent-select').click();
        await page.getByRole('option', { name: new RegExp(warehouseName) }).first().click();

        await page.getByTestId('create-location-submit-btn').click();

        // Wait for dialog cleanup
        await expect(page.getByText('Create Location')).not.toBeVisible();
        await expect(page.getByText(zoneName).first()).toBeVisible();

        // 5. Create Row under Zone A
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(rowName);

        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Row' }).click();

        await page.getByTestId('location-parent-select').click();
        // Match "Zone A (ROOM)" or similar
        await page.getByRole('option', { name: new RegExp(zoneName) }).first().click();

        await page.getByTestId('create-location-submit-btn').click();

        await expect(page.getByText('Create Location')).not.toBeVisible();
        await expect(page.getByText(rowName).first()).toBeVisible();

        // 6. Create Shelf under Row 1
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(shelfName);

        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Shelf' }).click();

        await page.getByTestId('location-parent-select').click();
        // Match "Row 1 (ROW)" or similar
        await page.getByRole('option', { name: new RegExp(rowName) }).first().click();

        await page.getByTestId('create-location-submit-btn').click();

        await expect(page.getByText('Create Location')).not.toBeVisible();
        await expect(page.getByText(shelfName).first()).toBeVisible();
    });

    test('TC-2.2: Define Location Attributes', async ({ page }) => {
        const timestamp = Date.now();
        const locName = `AttrLoc ${timestamp}`;

        // 1. Navigate to Locations
        await page.goto('/inventory/locations');
        await page.waitForLoadState('networkidle');
        // Wait for loading indicator to disappear if any
        await expect(page.getByText('Loading...')).not.toBeVisible();

        const createBtn = page.getByTestId('create-location-btn');
        await createBtn.click();
        await page.getByTestId('location-name-input').fill(locName);
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();

        await page.getByTestId('location-parent-select').click();
        // Seed warehouse is often named "Distribution Center 1" or similar
        const parentOption = page.getByRole('option', { name: /Distribution Center/i }).first();
        await parentOption.click();

        await page.getByTestId('create-location-submit-btn').click();
        // Wait for ANY dialog to be gone or specifically the creation heading
        await page.waitForSelector('h2:has-text("Create Location")', { state: 'hidden' });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(locName)).toBeVisible();

        // 2. Edit
        await page.getByText(locName).first().click();
        await expect(page.getByRole('heading', { name: locName, exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Edit Location' }).click();

        // 3. Add Custom Attribute
        await page.getByRole('button', { name: 'Add Attribute' }).click();

        // Fill Key and Value
        await page.getByPlaceholder('Key').fill('Temperature');
        await page.getByPlaceholder('Value').fill('-20C');

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // 4. Verify
        await expect(page.getByText('Temperature')).toBeVisible();
        await expect(page.getByText('-20C')).toBeVisible();
    });
});
