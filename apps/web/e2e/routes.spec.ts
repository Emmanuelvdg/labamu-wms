import { test, expect } from '@playwright/test';

test.describe('Routes Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('TC-13.1: Create Custom Route', async ({ page }) => {
        await page.goto('/inventory/routes');

        // Open Modal
        await page.getByRole('button', { name: 'New Route' }).click();
        await expect(page.getByRole('heading', { name: 'Create New Route' })).toBeVisible();

        // Fill Form
        const routeName = `Route ${Date.now()}`;
        const routeDesc = `Custom flow ${Date.now()}`;
        await page.getByLabel('Name').fill(routeName);
        await page.getByLabel('Description').fill(routeDesc);

        // Submit
        await page.getByRole('button', { name: 'Create' }).click();

        // Verify List (Cards)
        await expect(page.getByText(routeName)).toBeVisible();
        await expect(page.getByText(routeDesc)).toBeVisible();
    });
});
