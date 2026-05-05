/** @planRef E2E_Test_Plan11.md §Phase10 — Scenario 10.5 (Create Route); TC-13.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Routes Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-13.1: Create Custom Route', async ({ page }) => {
        await page.goto('/inventory/routes');

        await page.getByRole('button', { name: 'New Route' }).click();
        // Actual dialog title is "Create New Route Strategy"
        await expect(page.getByRole('heading', { name: 'Create New Route Strategy' })).toBeVisible();

        const routeName = `Route ${Date.now()}`;
        const routeDesc = `Custom flow ${Date.now()}`;
        // Label is "Route Name" (htmlFor="name")
        await page.getByLabel('Route Name').fill(routeName);
        await page.getByLabel('Description').fill(routeDesc);

        // Button text is "Create & Edit Canvas" — after click user is redirected to the builder
        await page.getByRole('button', { name: 'Create & Edit Canvas' }).click();

        // Verify navigation to the route builder (URL contains builder and an id param)
        await expect(page).toHaveURL(/\/inventory\/routes\/builder/, { timeout: 5000 });
    });
});
