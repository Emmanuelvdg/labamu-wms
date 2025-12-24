import { test, expect } from '@playwright/test';

test.describe('Partner Locations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-10.1: Create Partner Location', async ({ page }) => {
        await page.goto('/inventory/partners');
        await expect(page.getByRole('heading', { name: 'Partner Locations' })).toBeVisible();

        // Open Modal
        await page.getByRole('button', { name: '+ Register Location' }).click();
        await expect(page.getByRole('heading', { name: 'Register Partner Location' })).toBeVisible();

        // Fill Form
        const locName = `Retail Store ${Date.now()}`;
        await page.getByLabel('Name').fill(locName);

        await page.getByLabel('Type').selectOption('RETAIL');
        await page.getByLabel('Address').fill('123 High St, London');

        // Submit
        await page.getByRole('button', { name: 'Register' }).click();

        // Verify List
        await expect(page.getByRole('table')).toContainText(locName);
        await expect(page.getByRole('table')).toContainText('RETAIL');
    });
});
