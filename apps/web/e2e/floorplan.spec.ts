import { test, expect } from '@playwright/test';

test.describe('Floor Plan Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        // Wait for potential redirect/load
        await page.waitForURL('**/', { timeout: 10000 });
    });

    test('Scenario 7.1: Create Floor Plan Elements via Drag and Drop', async ({ page }) => {
        await page.goto('/floor-plan');

        // Wait for warehouses to load and select one
        const warehouseSelect = page.getByRole('combobox').first();
        await warehouseSelect.waitFor({ state: 'visible', timeout: 10000 });
        await warehouseSelect.click();

        // Try to find a warehouse option
        const option = page.getByRole('option').first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // 1. Drag "New Room" to Canvas
        // Palette items are in a div. We'll look for the one with "New Room"
        const roomPaletteItem = page.locator('div[draggable]').filter({ hasText: 'New Room' }).first();
        await roomPaletteItem.waitFor({ state: 'visible' });

        const canvas = page.locator('svg').first();

        // Perform drag and drop
        await roomPaletteItem.dragTo(canvas, {
            targetPosition: { x: 200, y: 200 }
        });

        // 2. Handle Create Modal
        await expect(page.getByText(/Create New ROOM/i)).toBeVisible({ timeout: 10000 });

        // The name input might already have a default like "New Room 1"
        await page.locator('#new-name').fill('Test Room 7.1');

        await page.getByRole('button', { name: 'Create Location' }).click();

        // 3. Verify on Canvas
        // The text is rendered inside the SVG
        await expect(page.locator('svg text').filter({ hasText: 'Test Room 7.1' })).toBeVisible({ timeout: 15000 });

        // 4. Cleanup (Delete from system)
        await page.locator('svg g').filter({ hasText: 'Test Room 7.1' }).click();

        // Sidebar should open
        await expect(page.getByText('Edit Zone')).toBeVisible({ timeout: 5000 });

        // Clicking Delete DB should trigger confirm
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete DB' }).click();

        // Verify it's gone
        await expect(page.locator('svg text').filter({ hasText: 'Test Room 7.1' })).not.toBeVisible();
    });
});
