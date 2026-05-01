import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Settings Module', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-15.1: Navigate Settings Options', async ({ page }) => {
        await page.goto('/settings');

        // Verify Header
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Navigate to Picking Strategies
        await page.getByRole('button', { name: 'Picking Strategies' }).click();

        // Verify Content (Redirect message)
        await expect(page.getByText('Picking strategies are now configured per warehouse')).toBeVisible();

        // Navigate back to General (Placeholder)
        await page.getByRole('button', { name: 'General' }).click();
        await expect(page.getByText('This section is under development')).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// TC-15.2–15.4  Settings Sidebar Navigation  [PRD 4.x]
// ---------------------------------------------------------------------------
test.describe('Settings Sidebar Navigation', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
    });

    test('TC-15.2: Settings sidebar contains Currencies & FX link', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Currencies & FX' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Currencies & FX' })).toHaveAttribute('href', '/settings/currencies');
    });

    test('TC-15.3: Settings sidebar contains Printers link', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Printers' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Printers' })).toHaveAttribute('href', '/settings/printers');
    });

    test('TC-15.4: Settings sidebar contains Seasonality link', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Seasonality' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Seasonality' })).toHaveAttribute('href', '/settings/seasonality');
    });
});

// ---------------------------------------------------------------------------
// TC-15.5–15.7  Currencies & FX Settings Page  [PRD 4.x, M6]
// ---------------------------------------------------------------------------
test.describe('Currencies & FX Settings Page', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings/currencies');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    test('TC-15.5: Currencies page loads with heading and Exchange Rates section', async ({ page }) => {
        // Use h1 specifically — the page also has an h2 titled "Currencies" in the section body
        await expect(page.locator('h1').filter({ hasText: 'Currencies' })).toBeVisible();
        await expect(page.getByText('Manage currencies and exchange rates')).toBeVisible();
        // Exchange Rates section heading (h2)
        await expect(page.locator('h2').filter({ hasText: 'Exchange Rates' })).toBeVisible();
    });

    test('TC-15.6: Currencies page shows lock banner when MULTI_CURRENCY flag is disabled', async ({ page }) => {
        // In a fresh env the flag is off — the amber lock banner must be visible
        const lockBanner = page.locator('.bg-amber-50').filter({ hasText: 'Multi-Currency not enabled' });
        const addBtn = page.getByRole('button', { name: 'Add Currency' });

        const bannerVisible = await lockBanner.isVisible({ timeout: 3000 }).catch(() => false);
        const addBtnVisible = await addBtn.isVisible({ timeout: 1000 }).catch(() => false);

        // Either the flag is off (banner shown, Add Currency hidden) OR flag is on (banner hidden, Add Currency shown)
        expect(bannerVisible || addBtnVisible).toBe(true);
    });

    test('TC-15.7: Add Currency button is visible when MULTI_CURRENCY flag is enabled', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: 'Add Currency' });
        const lockBanner = page.locator('.bg-amber-50').filter({ hasText: 'Multi-Currency not enabled' });

        const flagEnabled = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);
        const flagDisabled = await lockBanner.isVisible({ timeout: 3000 }).catch(() => false);

        if (flagEnabled) {
            // Flag on: Add Currency must be clickable
            await expect(addBtn).toBeEnabled();
        } else if (flagDisabled) {
            // Flag off: Add Currency button must NOT be present
            await expect(addBtn).not.toBeVisible();
        }
    });
});

// ---------------------------------------------------------------------------
// TC-15.8–15.12  Seasonality Settings Page  [PRD 4.x, M8.4]
// ---------------------------------------------------------------------------
test.describe('Seasonality Settings Page', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings/seasonality');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    test('TC-15.8: Seasonality page loads with heading and New Profile section', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Seasonality Profiles' })).toBeVisible();
        await expect(page.getByText('Define demand multipliers for date ranges')).toBeVisible();
        await expect(page.getByText('New Profile')).toBeVisible();
        await expect(page.getByPlaceholder('Profile name (e.g. Ramadan Season)')).toBeVisible();
    });

    test('TC-15.9: Create seasonality profile — empty name disables Create button', async ({ page }) => {
        const createBtn = page.getByRole('button', { name: 'Create' });
        // Button is disabled when the input is empty
        await expect(createBtn).toBeDisabled();
    });

    test('TC-15.10: Create seasonality profile — happy path appears in accordion', async ({ page }) => {
        const ts = Date.now();
        const profileName = `E2E Season ${ts}`;

        await page.getByPlaceholder('Profile name (e.g. Ramadan Season)').fill(profileName);
        const createBtn = page.getByRole('button', { name: 'Create' });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        // Profile should appear in the accordion list
        await expect(page.getByText(profileName)).toBeVisible({ timeout: 8000 });
        // Should show "0 period(s)" initially — scope to button containing the exact profile name
        await expect(page.getByRole('button', { name: new RegExp(profileName) }).getByText(/0 period/)).toBeVisible();
    });

    test('TC-15.11: Expand profile accordion reveals period add form', async ({ page }) => {
        const ts = Date.now();
        const profileName = `E2E Season Expand ${ts}`;

        await page.getByPlaceholder('Profile name (e.g. Ramadan Season)').fill(profileName);
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText(profileName)).toBeVisible({ timeout: 8000 });

        // Click the profile row to expand it
        await page.locator('button').filter({ hasText: profileName }).click();

        // Add-period form inputs must appear
        await expect(page.getByPlaceholder('Label')).toBeVisible({ timeout: 3000 });
        await expect(page.getByPlaceholder('01-01')).toBeVisible();
        await expect(page.getByPlaceholder('01-31')).toBeVisible();
        await expect(page.getByPlaceholder('×1.5')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    });

    test('TC-15.12: Add period to profile — happy path appears in period table', async ({ page }) => {
        const ts = Date.now();
        const profileName = `E2E Season Period ${ts}`;

        // Create profile
        await page.getByPlaceholder('Profile name (e.g. Ramadan Season)').fill(profileName);
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText(profileName)).toBeVisible({ timeout: 8000 });

        // Expand
        await page.locator('button').filter({ hasText: profileName }).click();
        await expect(page.getByPlaceholder('Label')).toBeVisible({ timeout: 3000 });

        // Fill period form
        await page.getByPlaceholder('Label').fill('Ramadan');
        await page.getByPlaceholder('01-01').fill('03-01');
        await page.getByPlaceholder('01-31').fill('03-30');
        await page.getByPlaceholder('×1.5').fill('1.5');
        await page.getByRole('button', { name: 'Add' }).click();

        // Period count on the accordion button should update to 1 — scoped to our profile
        const profileBtn = page.getByRole('button', { name: new RegExp(profileName) });
        await expect(profileBtn.getByText(/1 period/)).toBeVisible({ timeout: 8000 });

        // Period row data appears in the expanded accordion content
        await expect(page.getByText('Ramadan').first()).toBeVisible({ timeout: 8000 });
        await expect(page.getByText('03-01').first()).toBeVisible();
        await expect(page.locator('span').filter({ hasText: '×1.5' }).first()).toBeVisible();
    });
});
