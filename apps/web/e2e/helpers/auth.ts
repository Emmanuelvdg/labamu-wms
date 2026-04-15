import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@labamu.co.id';
export const ADMIN_PASSWORD = 'admin';

/**
 * Logs in as admin and waits for the dashboard to load.
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
