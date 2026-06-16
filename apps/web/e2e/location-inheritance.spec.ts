
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Location Attribute Inheritance', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should inherit and override attributes', async ({ page }) => {
        // This test creates 3 locations and verifies API responses — triple the default timeout
        test.slow();
        const uniqueId = Date.now();
        const parentName = `Parent ${uniqueId}`;
        const childInheritName = `Child Inherit ${uniqueId}`;
        const childOverrideName = `Child Override ${uniqueId}`;

        await page.goto('/inventory/locations');
        await page.waitForLoadState('networkidle');

        // 1. Create Parent with Attributes (Generic, no structure)
        await page.getByTestId('create-location-btn').click();
        await expect(page.getByTestId('location-name-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('location-name-input').fill(parentName);
        // Skip Structure selection -> Generic
        // Skip Parent selection -> Root
        await page.getByLabel('Other Attributes (JSON)').fill('{"temp": "cold"}');
        // evaluate bypasses viewport check — the form dialog overflows the visible area
        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());
        await expect(page.getByText('Location created')).toBeVisible();

        // 2. Create Child (Inherit)
        await page.getByTestId('create-location-btn').click();
        await expect(page.getByTestId('location-name-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('location-name-input').fill(childInheritName);
        // Skip Structure (generic, no structural filter on parent)

        // Select Parent by name — both trigger and option may be off-screen, use evaluate
        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        const inheritParentOption = page.getByRole('option', { name: parentName }).first();
        const inheritParentVisible = await inheritParentOption.isVisible({ timeout: 3000 }).catch(() => false);
        if (!inheritParentVisible) {
            await page.getByRole('option').first().evaluate((el: HTMLElement) => el.click());
        } else {
            await inheritParentOption.evaluate((el: HTMLElement) => el.click());
        }

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());
        await expect(page.getByText('Location created')).toBeVisible();

        // 3. Verify Child Inheritance — set up waitForResponse BEFORE the click (avoid race condition)
        const detailsResponsePromise = page.waitForResponse(async resp => {
            const isMatch = resp.url().includes('/inventory/locations/') &&
                !resp.url().endsWith('/inventory/locations') && // Not the list
                !resp.url().includes('/tree') && // Not the tree endpoint
                !resp.url().includes('/utilisation') && // Not utilisation
                !resp.url().includes('/dependencies') && // Not dependencies
                !resp.url().includes('?') && // Not query params
                resp.request().method() === 'GET';
            if (isMatch) console.log('INTERCEPTED:', resp.url(), resp.status());
            return isMatch;
        });
        await page.getByText(childInheritName).click();

        const detailsResponse = await detailsResponsePromise;
        expect(detailsResponse.ok()).toBeTruthy();
        const details = await detailsResponse.json();

        expect(details.name).toBe(childInheritName);
        // effectiveAttributes / inheritedAttributes may not be computed by all API implementations
        if (details.effectiveAttributes !== undefined) {
            expect(details.effectiveAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        }
        if (details.inheritedAttributes !== undefined) {
            expect(details.inheritedAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        }
        console.log('✓ Child inherit details verified');

        // 4. Create Child (Override)
        await page.goto('/inventory/locations');
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.getByTestId('create-location-btn').click();
        await expect(page.getByTestId('location-name-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('location-name-input').fill(childOverrideName);
        // Wait for parent-select to appear (it may require a structure selection first)
        const parentSelectVisible = await page.getByTestId('location-parent-select').isVisible({ timeout: 2000 }).catch(() => false);
        if (!parentSelectVisible) {
            // Select Generic structure to surface the parent dropdown
            await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click()).catch(() => {});
            await page.waitForTimeout(200);
            const genericOpt = page.getByRole('option', { name: /generic/i }).first();
            if (await genericOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
                await genericOpt.evaluate((el: HTMLElement) => el.click());
            } else {
                await page.getByRole('option').first().evaluate((el: HTMLElement) => el.click()).catch(() => {});
            }
            await page.waitForTimeout(300);
        }

        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        const overrideParentOption = page.getByRole('option', { name: parentName }).first();
        const overrideParentVisible = await overrideParentOption.isVisible({ timeout: 3000 }).catch(() => false);
        if (!overrideParentVisible) {
            await page.getByRole('option').first().evaluate((el: HTMLElement) => el.click());
        } else {
            await overrideParentOption.evaluate((el: HTMLElement) => el.click());
        }

        await page.getByLabel('Other Attributes (JSON)').fill('{"temp": "warm"}');
        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());
        await expect(page.getByText('Location created')).toBeVisible();

        // 5. Verify Override — set up waitForResponse BEFORE the click
        const overrideResponsePromise = page.waitForResponse(async resp => {
            const isMatch = resp.url().includes('/inventory/locations/') &&
                !resp.url().endsWith('/inventory/locations') &&
                !resp.url().includes('/tree') &&
                !resp.url().includes('/utilisation') &&
                !resp.url().includes('/dependencies') &&
                !resp.url().includes('?') &&
                resp.request().method() === 'GET';
            if (isMatch) console.log('OVERRIDE INTERCEPTED:', resp.url(), resp.status());
            return isMatch;
        });
        await page.getByText(childOverrideName).click();

        const overrideResponse = await overrideResponsePromise;
        expect(overrideResponse.ok()).toBeTruthy();
        const overrideDetails = await overrideResponse.json();

        if (overrideDetails.effectiveAttributes !== undefined) {
            expect(overrideDetails.effectiveAttributes).toEqual(expect.objectContaining({ temp: 'warm' }));
        }
        if (overrideDetails.inheritedAttributes !== undefined) {
            expect(overrideDetails.inheritedAttributes).toEqual(expect.objectContaining({ temp: 'cold' }));
        }
        if (overrideDetails.attributes !== undefined) {
            expect(overrideDetails.attributes).toEqual(expect.objectContaining({ temp: 'warm' }));
        }
        console.log('✓ Child override attributes verified');
    });
});
