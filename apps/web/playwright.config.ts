import { defineConfig, devices } from '@playwright/test';

/**
 * Auth state written by auth.setup.ts — consumed by tests that want to start
 * already authenticated (skipping the login form entirely).
 */
const AUTH_STATE_PATH = 'e2e/.auth/admin.json';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    /**
     * 1 worker prevents the login throttle (5 req/60s on the auth endpoint)
     * from being triggered when many tests log in at the same time.
     * The suite is naturally sequential when running the full regression.
     * For faster local runs on a focused subset use --workers=4 explicitly.
     */
    workers: 1,
    reporter: 'html',
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        actionTimeout: 15000,
    },
    projects: [
        /**
         * Setup project: logs in once, persists cookies to AUTH_STATE_PATH.
         * Useful when running tests that use the storageState option.
         */
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },

        /**
         * Main project — all specs start already authenticated via storageState.
         * The setup project must run first to write the auth cookies to disk.
         * loginAsAdmin() short-circuits when the browser is already at '/'.
         * testIgnore excludes the setup file and the helpers directory.
         */
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE_PATH },
            dependencies: ['setup'],
            testIgnore: ['**/auth.setup.ts', '**/helpers/**'],
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
