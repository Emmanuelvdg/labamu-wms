
import { test, expect } from '@playwright/test';

test.describe('Location Uniqueness', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('should prevent duplicate location names in same scope', async ({ page }) => {
        const uniqueId = Date.now();
        const locName = `Unique Room ${uniqueId}`;

        await page.goto('/inventory/locations');

        // 1. Create First Location
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(locName);
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();
        // Select Parent (assuming at least one root exists, or we create one)
        // For simplicity, let's pick the first available parent if any, or ensure we have one.
        // Actually, creating a Warehouse (root) first is safer. But UI doesn't allow creating 'WAREHOUSE' structure easily in the modal (we removed it).
        // Let's look for a parent.
        await page.getByTestId('location-parent-select').click();
        const parentOption = page.getByRole('option').first();
        const parentName = await parentOption.textContent();
        await parentOption.click(); // Pick first available parent

        await page.getByTestId('create-location-submit-btn').click();
        await expect(page.getByText('Location created')).toBeVisible();

        // 2. Attempt Duplicate and Intercept Request
        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/inventory/locations') &&
            response.request().method() === 'POST'
        );

        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(locName);
        await page.getByTestId('location-structure-select').click();
        await page.getByRole('option', { name: 'Room' }).click();
        await page.getByTestId('location-parent-select').click();
        // Re-select same parent
        if (parentName) {
            await page.getByRole('option', { name: parentName.trim() }).first().click();
        } else {
            await page.getByRole('option').first().click();
        }

        await page.getByTestId('create-location-submit-btn').click();

        const response = await responsePromise;
        expect(response.status()).toBe(409); // Conflict
        const body = await response.json();
        expect(body.message).toContain('already exists');
    });
});
