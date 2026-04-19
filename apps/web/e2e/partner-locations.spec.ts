import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Partner Locations', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-10.1: Create Partner Location', async ({ page }) => {
        await page.goto('/inventory/partners');
        await expect(page.getByRole('heading', { name: 'Partner Locations' })).toBeVisible();

        // Open Modal
        await page.getByRole('button', { name: '+ Register Location' }).click();
        await expect(page.getByRole('heading', { name: 'Register Partner Location' })).toBeVisible();

        // Fill Form — labels have no htmlFor so getByLabel fails; use modal-scoped locators
        const locName = `Retail Store ${Date.now()}`;
        const modal = page.locator('.fixed.inset-0');

        // First <input> in the form is the Name field
        await modal.locator('input').first().fill(locName);

        // Native <select> for Type
        await modal.locator('select').selectOption('RETAIL');

        // Address is optional; skip it to avoid the lat/lng validation requirement

        // Submit
        await page.getByRole('button', { name: 'Register', exact: true }).click();

        // Verify List
        await expect(page.getByRole('table')).toContainText(locName);
        await expect(page.getByRole('table')).toContainText('RETAIL');
    });
});
