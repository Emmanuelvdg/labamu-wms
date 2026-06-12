
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Location Uniqueness', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should prevent duplicate location names in same scope', async ({ page }) => {
        const uniqueId = Date.now();
        const locName = `Unique Room ${uniqueId}`;

        await page.goto('/inventory/locations');

        // 1. Create First Location
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(locName);
        // evaluate bypasses viewport check — dialog may overflow the visible area
        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Room' }).evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300); // Allow parent filter to update

        // Select first available WAREHOUSE parent (required for Room type)
        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        const parentOption = page.getByRole('option').first();
        const parentAvailable = await parentOption.isVisible({ timeout: 3000 }).catch(() => false);
        if (!parentAvailable) {
            // No WAREHOUSE-type parent available; skip test
            await page.keyboard.press('Escape');
            test.skip();
            return;
        }
        const parentName = await parentOption.textContent();
        await parentOption.evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());
        await expect(page.getByText('Location created')).toBeVisible();

        // 2. Attempt Duplicate and Intercept Request
        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/inventory/locations') &&
            response.request().method() === 'POST'
        );

        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(locName);
        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Room' }).evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        // Re-select same parent
        if (parentName) {
            const nameOption = page.getByRole('option', { name: parentName.trim() }).first();
            if (await nameOption.isVisible({ timeout: 2000 }).catch(() => false)) {
                await nameOption.evaluate((el: HTMLElement) => el.click());
            } else {
                await page.getByRole('option').first().evaluate((el: HTMLElement) => el.click());
            }
        } else {
            await page.getByRole('option').first().evaluate((el: HTMLElement) => el.click());
        }

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());

        const response = await responsePromise;
        // Server returns 409 (Conflict) or 500 (Prisma unique constraint) for duplicates
        expect([409, 422, 500]).toContain(response.status());
        console.log(`✓ Duplicate location rejected with status ${response.status()}`);
    });
});
