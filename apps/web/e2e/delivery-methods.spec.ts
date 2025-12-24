import { test, expect } from '@playwright/test';

test.describe('Delivery Methods', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-16.1: Create Delivery Method', async ({ page }) => {
        await page.goto('/configuration/delivery-methods');

        // Open Modal
        await page.getByRole('button', { name: '+ Create Method' }).click();
        await expect(page.getByRole('heading', { name: 'New Delivery Method' })).toBeVisible();

        // Fill Form
        const methodName = `Express ${Date.now()}`;
        await page.locator('input[type="text"]').first().fill(methodName);

        // Select Provider (Default Fixed Price)
        await page.locator('input[type="number"]').first().fill('15.50');

        // Save
        await page.getByRole('button', { name: 'Save Method' }).click();

        // Verify List
        await expect(page.getByRole('table')).toContainText(methodName);
        await expect(page.getByRole('table')).toContainText('$15.5');
    });
});
