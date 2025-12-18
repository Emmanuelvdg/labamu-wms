import { test, expect } from '@playwright/test';

test.describe('Warehouse Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
    });

    test('TC-2.1: Create Multi-Level Warehouse Hierarchy', async ({ page }) => {
        // 1. Navigate to Warehouses
        await page.getByRole('link', { name: 'Warehouses', exact: true }).click();

        // 2. Create Warehouse
        await page.getByTestId('create-warehouse-btn').click();
        await page.getByTestId('warehouse-name-input').fill('Central DC');
        await page.getByTestId('warehouse-shortname-input').fill('CDC');
        await page.getByTestId('warehouse-address-input').fill('123 Main St');
        await page.getByTestId('warehouse-company-input').fill('Labamu Inc');
        await page.getByTestId('submit-warehouse-btn').click();

        // Use verify to ensure it was created before proceeding
        await expect(page.getByText('Central DC')).toBeVisible();

        // 3. Navigate to Locations Management
        await page.goto('/inventory/locations');

        // 4. Create Zone (Room) under Warehouse
        // We need to wait for the warehouse to appear in the parent list.
        // Since we just created it, it might take a moment or need a reload if SWR is cached, but navigate should work.

        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill('Zone A');

        // Structure: Room (mapped to Zone concept)
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();

        // Parent: Central DC
        await page.getByTestId('location-parent-select').click();
        await page.getByRole('option', { name: 'Central DC' }).click();

        await page.getByTestId('create-location-submit-btn').click();

        // Verify Zone A created
        await expect(page.getByText('Zone A').first()).toBeVisible();

        // 5. Create Row under Zone A
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill('Row 1');

        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Row' }).click();

        await page.getByTestId('location-parent-select').click();
        // It might be nested in the select or just listed. The SelectItem labels might be indented, but the value/text should be searchable.
        // If specific text matching is hard, we can try to type if it supported search, but it's a simple Select.
        await page.getByRole('option', { name: 'Zone A' }).first().click();

        await page.getByTestId('create-location-submit-btn').click();

        // Verify Row 1 created
        await expect(page.getByText('Row 1').first()).toBeVisible();

        // 6. Create Shelf under Row 1
        await page.reload(); // Refresh to ensure parent list is updated
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill('Shelf A');

        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Shelf' }).click();

        await page.getByTestId('location-parent-select').click();
        await page.getByRole('option', { name: 'Row 1' }).click();

        await page.getByTestId('create-location-submit-btn').click();

        // Verification of hierarchy
        await expect(page.getByText('Shelf A').first()).toBeVisible();
    });

    test('TC-2.2: Define Location Attributes', async ({ page }) => {
        // 1. Navigate to Locations
        await page.goto('/inventory/locations');

        // Create a location to edit (ensure it exists)
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill('LocForAttrs');
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();
        await page.getByTestId('location-parent-select').click();
        // Use E2E Warehouse from seed if available, or try Central DC from previous test if sequential
        // For safety, we'll try E2E Warehouse first.
        const parentOption = page.getByRole('option', { name: 'E2E Warehouse' });
        if (await parentOption.isVisible()) {
            await parentOption.click();
        } else {
            await page.getByRole('option').first().click(); // Fallback to first available parent
        }
        await page.getByTestId('create-location-submit-btn').click();
        await expect(page.getByText('LocForAttrs')).toBeVisible();

        // 2. Edit
        await page.getByText('LocForAttrs').click();
        await page.getByRole('button', { name: 'Edit Location' }).click();

        // 3. Add Custom Attribute
        await page.getByRole('button', { name: 'Add Attribute' }).click();

        // Fill Key and Value (inputs are placeholders)
        await page.getByPlaceholder('Key').fill('Temperature');
        await page.getByPlaceholder('Value').fill('-20C');

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // 4. Verify
        await expect(page.getByText('Temperature')).toBeVisible();
        await expect(page.getByText('-20C')).toBeVisible();
    });
});
