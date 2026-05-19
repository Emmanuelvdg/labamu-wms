import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@labamu.co.id';
export const ADMIN_PASSWORD = 'password123';

// Platform admin — has ALL:MANAGE permission (required for /platform/* API endpoints).
// Run apps/api/scripts/grant_admin.ts to assign ALL:MANAGE to this user.
// Override via env vars: PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD
export const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@labamu.co.id';
export const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'password123';

/**
 * Logs in as the tenant admin and waits for the dashboard to load.
 *
 * If the browser context already has valid auth cookies (e.g. via
 * Playwright storageState), navigating to '/' will succeed without
 * hitting /login — in that case we skip the form fill so we do NOT
 * consume one of the API's 5-logins-per-60s throttle slots.
 */
export async function loginAsAdmin(page: Page) {
    // Try the root first; middleware redirects unauthenticated requests to /login.
    await page.goto('/');
    const currentUrl = page.url();

    // If we landed somewhere other than /login we are already authenticated.
    if (!currentUrl.includes('/login')) {
        return;
    }

    // Not yet authenticated — perform the form login.
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveURL(/\/$/);
}

/**
 * Logs in as the Labamu platform admin (ALL:MANAGE permission).
 * Platform admin uses the same account as tenant admin (admin@labamu.co.id).
 *
 * Checks auth via cookies WITHOUT navigating — this preserves the current page
 * state in serial test suites where beforeEach calls this but tests depend on
 * navigation state set by prior tests (e.g. backoffice TC-35.x).
 */
export async function loginAsPlatformAdmin(page: Page) {
    // Check auth cookie without navigating — avoids resetting serial test page state.
    const cookies = await page.context().cookies();
    const isAuthenticated = cookies.some(c => c.name === 'auth' && c.value === 'true') ||
        cookies.some(c => c.name === 'token' && c.value);

    if (isAuthenticated) {
        return;
    }

    await page.goto('/login');
    await page.getByLabel('Email').fill(PLATFORM_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(PLATFORM_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveURL(/\/$/);
}
