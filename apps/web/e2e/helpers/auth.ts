import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@labamu.co.id';
export const ADMIN_PASSWORD = 'admin';

// Platform admin — has ALL:MANAGE permission (required for /platform/* API endpoints).
// Run apps/api/scripts/grant_admin.ts to assign ALL:MANAGE to this user.
// Override via env vars: PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD
export const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@labamu.co.id';
export const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'admin';

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
 * Always clears cookies first to override any pre-loaded storageState (tenant admin).
 * Required for backoffice /admin pages to successfully call /platform/* API endpoints.
 */
export async function loginAsPlatformAdmin(page: Page) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Email').fill(PLATFORM_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(PLATFORM_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveURL(/\/$/);
}
