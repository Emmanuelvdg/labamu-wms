/**
 * auth.setup.ts — Playwright "setup" project entry point.
 *
 * Logs in once as admin, then saves the browser storage state (cookies +
 * localStorage) to disk.  Any project that sets:
 *   storageState: 'e2e/.auth/admin.json'
 * will start each test already authenticated, skipping the login form.
 *
 * To wire storageState for a project, add to playwright.config.ts:
 *
 *   {
 *     name: 'chromium-authenticated',
 *     use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
 *     dependencies: ['setup'],
 *   }
 */
import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/auth';

const AUTH_DIR = path.join('e2e', '.auth');
const AUTH_STATE_PATH = path.join(AUTH_DIR, 'admin.json');

setup('authenticate as admin', async ({ page }) => {
    // Ensure the output directory exists
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    // Reuse existing auth state if it was written within the last 30 minutes.
    // This prevents triggering the API's 5-logins-per-60s rate limiter when
    // the regression suite is run multiple times back-to-back.
    if (fs.existsSync(AUTH_STATE_PATH)) {
        const ageSec = (Date.now() - fs.statSync(AUTH_STATE_PATH).mtimeMs) / 1000;
        if (ageSec < 1800) {
            return;
        }
    }

    await page.goto('/login');

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveURL(/\/$/);

    // Persist cookies so subsequent contexts start already authenticated
    await page.context().storageState({ path: AUTH_STATE_PATH });
});
