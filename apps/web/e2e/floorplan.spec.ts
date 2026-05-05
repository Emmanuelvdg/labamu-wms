/** @planRef E2E_Test_Plan11.md §Phase7 — Scenarios 7.1–7.7 (Floor Plan Canvas, Drag/Drop, Zone Linking) */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Floor Plan Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Scenario 7.1: Create Floor Plan Elements via Drag and Drop', async ({ page }) => {
        const roomName = `Test Room ${Date.now()}`;

        await page.goto('/floor-plan');

        // Wait for warehouses to load and select one
        const warehouseSelect = page.getByRole('combobox').first();
        await warehouseSelect.waitFor({ state: 'visible', timeout: 10000 });
        await warehouseSelect.click();

        const option = page.getByRole('option').first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // Wait for warehouse data (including root location ID) to fully load before dragging
        await page.waitForLoadState('networkidle');

        // Drag "New Room" palette item to canvas
        const roomPaletteItem = page.locator('div[draggable]').filter({ hasText: 'New Room' }).first();
        await roomPaletteItem.waitFor({ state: 'visible' });

        // Use the floor-plan canvas SVG specifically (not Lucide icon SVGs)
        const canvas = page.getByTestId('floor-plan-canvas');

        await roomPaletteItem.dragTo(canvas, {
            targetPosition: { x: 400, y: 300 }
        });

        // Handle Create Modal
        await expect(page.getByText(/Create New ROOM/i)).toBeVisible({ timeout: 10000 });

        await page.locator('#elementName').fill(roomName);

        await page.getByRole('button', { name: 'Create' }).click();

        // Verify on Canvas — wait for dialog to close first (API success closes the dialog)
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('svg text').filter({ hasText: roomName })).toBeVisible({ timeout: 10000 });

        // Cleanup
        await page.locator('svg g').filter({ hasText: roomName }).first().click();
        await expect(page.getByText('Edit Zone')).toBeVisible({ timeout: 5000 });

        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete DB' }).click();

        await expect(page.locator('svg text').filter({ hasText: roomName })).not.toBeVisible();
    });
});
