
import { test, expect } from '@playwright/test';

test.describe('Location Attribute Inheritance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('admin@labamu.co.id');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/');
    });

    test('should inherit and override attributes', async ({ page }) => {
        const uniqueId = Date.now();
        const parentName = `Parent ${uniqueId}`;
        const childInheritName = `Child Inherit ${uniqueId}`;
        const childOverrideName = `Child Override ${uniqueId}`;

        await page.goto('/inventory/locations');

        // 1. Create Parent with Attributes (Generic, no structure)
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(parentName);
        // Skip Structure selection -> Generic
        // Skip Parent selection -> Root
        await page.getByLabel('Other Attributes (JSON)').fill('{"temp": "cold"}');
        await page.getByTestId('create-location-submit-btn').click();
        await expect(page.getByText('Location created')).toBeVisible();

        // 2. Create Child (Inherit)
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(childInheritName);
        // Skip Structure

        // Select Parent
        await page.getByTestId('location-parent-select').click();
        await page.getByRole('option', { name: parentName }).click();

        await page.getByTestId('create-location-submit-btn').click();
        await expect(page.getByText('Location created')).toBeVisible();

        // 3. Verify Child Inheritance via API (simulate clicking on details or just fetch)
        // We can navigate to details page /inventory/locations/[id] if we knew ID.
        // Or we can intercept the response of "fetchLocationsTree" or similar, but tree usually doesn't have deep attributes.
        // We can verify by clicking the child in the tree? The tree component might not show attributes.
        // Let's rely on navigating to the details page by text.
        await page.getByText(childInheritName).click();

        // Wait for details response
        // Note: The URL will be /inventory/locations/[uuid]
        const detailsResponse = await page.waitForResponse(async resp => {
            const isMatch = resp.url().includes('/inventory/locations/') &&
                !resp.url().endsWith('/inventory/locations') && // Not the list
                !resp.url().includes('?') && // Not query params usually
                resp.request().method() === 'GET';
            if (isMatch) console.log('INTERCEPTED:', resp.url(), resp.status());
            return isMatch;
        });
        expect(detailsResponse.ok()).toBeTruthy();
        const details = await detailsResponse.json();

        expect(details.name).toBe(childInheritName);
        expect(details.effectiveAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        expect(details.inheritedAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        expect(details.attributes).toEqual({}); // Empty own attributes (or at least no temp)

        // 4. Create Child (Override)
        await page.goto('/inventory/locations');
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(childOverrideName);
        // Skip Structure

        await page.getByTestId('location-parent-select').click();
        await page.getByRole('option', { name: parentName }).click();

        await page.getByLabel('Other Attributes (JSON)').fill('{"temp": "warm"}');
        await page.getByTestId('create-location-submit-btn').click();
        await expect(page.getByText('Location created')).toBeVisible();

        // 5. Verify Override
        await page.getByText(childOverrideName).click();
        const overrideResponse = await page.waitForResponse(async resp => {
            const isMatch = resp.url().includes('/inventory/locations/') &&
                !resp.url().endsWith('/inventory/locations') &&
                !resp.url().includes('?') &&
                resp.request().method() === 'GET';
            if (isMatch) console.log('OVERRIDE INTERCEPTED:', resp.url(), resp.status());
            return isMatch;
        });
        expect(overrideResponse.ok()).toBeTruthy();
        const overrideDetails = await overrideResponse.json();

        expect(overrideDetails.effectiveAttributes).toEqual(expect.objectContaining({ temp: 'warm' }));
        expect(overrideDetails.inheritedAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        expect(overrideDetails.attributes).toEqual(expect.objectContaining({ temp: 'warm' }));
    });
});
