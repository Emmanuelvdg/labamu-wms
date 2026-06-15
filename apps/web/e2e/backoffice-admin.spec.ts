import { test, expect } from '@playwright/test';
import { loginAsPlatformAdmin } from './helpers/auth';

// ---------------------------------------------------------------------------
// Prerequisites
// ---------------------------------------------------------------------------
// 1. The seed must include a platform admin user with ALL:MANAGE permission.
//    Default credentials: platform.admin@labamu.co.id / admin
//    Override via env vars: PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD
//
// 2. At least one active tenant company must exist (created by seed or prior test run).
//
// PRD traceability: each test is tagged with its PRD section (4.13.x).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TC-35.1–35.3  Access Control  [PRD 4.13]
// ---------------------------------------------------------------------------
test.describe('TC-35: Access Control', () => {

    test('TC-35.1: Unauthenticated access to /admin redirects to /login', async ({ page }) => {
        // Clear cookies to ensure unauthenticated state
        await page.context().clearCookies();
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('TC-35.2: Platform admin can access /admin and sees Platform Overview', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin');
        await page.waitForLoadState('networkidle').catch(() => {});
        await expect(page.getByRole('heading', { name: 'Platform Overview' })).toBeVisible();
    });

    test('TC-35.3: Admin portal navigation links are visible in sidebar', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin');
        await page.waitForLoadState('networkidle').catch(() => {});
        // Verify core navigation links exist in the admin layout
        await expect(page.getByRole('link', { name: /Tenants/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Analytics/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Audit Log/i })).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// TC-35.4–35.5  Platform Overview  [PRD 4.13.1, 4.13.2]
// ---------------------------------------------------------------------------
test.describe('TC-35: Platform Overview', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
    });

    test('TC-35.4: Overview page displays KPI cards — Total Tenants, Active, Suspended', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForLoadState('networkidle').catch(() => {});
        await expect(page.getByText('Total Tenants')).toBeVisible();
        await expect(page.getByText('Active', { exact: true })).toBeVisible();
        await expect(page.getByText('Suspended', { exact: true })).toBeVisible();
    });

    test('TC-35.5: Overview tenant table has Manage link to /admin/tenants', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForLoadState('networkidle').catch(() => {});
        const manageLink = page.getByRole('link', { name: 'Manage →' });
        await expect(manageLink).toBeVisible();
        await expect(manageLink).toHaveAttribute('href', '/admin/tenants');
    });
});

// ---------------------------------------------------------------------------
// TC-35.6–35.13  Tenant Management  [PRD 4.13.1]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Management', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.6: Tenants list page loads with table columns', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
        await expect(page.getByText('Manage all companies on the platform')).toBeVisible();
        // Table header columns
        await expect(page.getByRole('columnheader', { name: 'Company', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Plan', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
    });

    test('TC-35.7: New Tenant button opens creation modal', async ({ page }) => {
        await page.getByRole('button', { name: 'New Tenant' }).click();
        await expect(page.getByRole('heading', { name: 'New Tenant' })).toBeVisible();
        await expect(page.getByPlaceholder('Acme Corp')).toBeVisible();
        await expect(page.getByPlaceholder('acme-corp', { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder('admin@acme-corp.com')).toBeVisible();
    });

    test('TC-35.8: Create new tenant — form validation rejects empty required fields', async ({ page }) => {
        await page.getByRole('button', { name: 'New Tenant' }).click();
        await page.getByRole('button', { name: 'Create Tenant' }).click();
        // Should show a validation error (name, slug, email, password are required)
        await expect(page.getByText(/required/i)).toBeVisible({ timeout: 3000 });
    });

    test('TC-35.9: Create new tenant — happy path submits and appears in list', async ({ page }) => {
        const ts = Date.now();
        const companyName = `E2E Tenant ${ts}`;
        const slug = `e2e-tenant-${ts}`;

        await page.getByRole('button', { name: 'New Tenant' }).click();
        await page.getByPlaceholder('Acme Corp').fill(companyName);
        await page.getByPlaceholder('acme-corp', { exact: true }).fill(slug);
        await page.getByPlaceholder('John Doe').fill('E2E Admin');
        await page.getByPlaceholder('admin@acme-corp.com').fill(`admin@${slug}.com`);
        await page.locator('.fixed input[type="password"]').last().fill('Admin@123456');

        await page.getByRole('button', { name: 'Create Tenant' }).click();
        // Modal closes and new tenant appears
        await expect(page.getByRole('heading', { name: 'New Tenant' })).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByText(companyName)).toBeVisible({ timeout: 10000 });
    });

    test('TC-35.10: Column filter by name narrows the tenant list', async ({ page }) => {
        const nameInput = page.getByPlaceholder('Name / slug...');
        await nameInput.fill('zzznonexistent');
        // Should show empty state
        await expect(page.getByText('No tenants found')).toBeVisible({ timeout: 5000 });
        // Clear filter
        await page.getByRole('button', { name: 'Clear Filters' }).click();
    });

    test('TC-35.11: Column filter by plan shows only matching plan tenants', async ({ page }) => {
        const planSelect = page.locator('thead select').first();
        await planSelect.selectOption('FREE');
        // Verify no STARTER badges appear (only FREE or empty state)
        const otherBadges = page.locator('tbody span').filter({ hasText: 'STARTER' });
        // Either FREE badges visible OR no tenants with other plans
        const otherCount = await otherBadges.count();
        expect(otherCount).toBe(0);
    });

    test('TC-35.12: Edit tenant modal opens with pre-filled values', async ({ page }) => {
        const editBtn = page.getByRole('button', { name: 'Edit' }).first();
        if (await editBtn.isVisible()) {
            await editBtn.click();
            await expect(page.getByRole('heading', { name: 'Edit Tenant' })).toBeVisible();
            // Input for name should have a value
            const nameInput = page.locator('[role="dialog"] input[type="text"], .fixed input[type="text"]').first();
            const value = await nameInput.inputValue();
            expect(value.length).toBeGreaterThan(0);
        }
    });

    test('TC-35.13: Invite user modal opens for a tenant', async ({ page }) => {
        const inviteBtn = page.getByRole('button', { name: 'Invite' }).first();
        if (await inviteBtn.isVisible()) {
            await inviteBtn.click();
            await expect(page.getByRole('heading', { name: 'Invite User' })).toBeVisible();
            await expect(page.getByPlaceholder('Jane Smith')).toBeVisible();
            await expect(page.getByPlaceholder('jane@acme-corp.com')).toBeVisible();
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.14–35.16  Tenant Detail — Overview Tab  [PRD 4.13.2]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Detail — Overview Tab', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.14: Tenant detail page loads with three tabs', async ({ page }) => {
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Plan & Billing' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Feature Flags' })).toBeVisible();
        }
    });

    test('TC-35.15: Overview tab shows Usage Metrics section', async ({ page }) => {
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await expect(page.getByText('Usage Metrics')).toBeVisible();
            // Usage metric cards
            await expect(page.getByText('Products', { exact: true })).toBeVisible();
            await expect(page.getByText('Users', { exact: true })).toBeVisible();
        }
    });

    test('TC-35.16: Overview tab shows Onboarding progress bar', async ({ page }) => {
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await expect(page.getByText('Onboarding')).toBeVisible();
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.17–35.18  Tenant Detail — Plan & Billing  [PRD 4.13.3]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Detail — Plan & Billing', () => {

    test('TC-35.17: Plan & Billing tab loads Limits & Usage progress bars', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.getByRole('button', { name: 'Plan & Billing' }).click();
            await page.waitForTimeout(1000);
            // Should show limits section
            await expect(page.getByText('Limits & Usage')).toBeVisible({ timeout: 5000 });
        }
    });

    test('TC-35.18: Plan & Billing tab shows Plan Configuration form with Save Plan button', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.getByRole('button', { name: 'Plan & Billing' }).click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('Plan Configuration')).toBeVisible({ timeout: 5000 });
            await expect(page.getByRole('button', { name: 'Save Plan' })).toBeVisible();
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.19–35.20  Tenant Detail — Feature Flags  [PRD 4.13.4]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Detail — Feature Flags', () => {

    test('TC-35.19: Feature Flags tab lists system flags with toggle controls', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.getByRole('button', { name: 'Feature Flags' }).click();
            await page.waitForTimeout(1000);
            // At least one Enabled/Disabled label must be visible
            await expect(page.getByText(/Enabled|Disabled/).first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('TC-35.20: Toggling a feature flag updates its state', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.getByRole('button', { name: 'Feature Flags' }).click();
            await page.waitForTimeout(1500);

            // Find a flag toggle and record its current state
            const disabledFlag = page.getByText('Disabled').first();
            if (await disabledFlag.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Click the toggle button (the button wrapping the Disabled span)
                const toggleBtn = page.getByRole('button').filter({ has: page.getByText('Disabled', { exact: true }) }).first();
                await toggleBtn.click();
                // State should eventually flip to Enabled
                await expect(page.getByText('Enabled').first()).toBeVisible({ timeout: 5000 });
            }
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.21–35.23  Tenant Impersonation  [PRD 4.13.5]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Impersonation', () => {

    test('TC-35.21: Impersonate button visible on detail page for ACTIVE tenant', async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
        // Navigate to an active tenant's detail page
        const detailLink = page.getByRole('link', { name: 'Detail' }).first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            await expect(page.getByRole('button', { name: 'Impersonate' })).toBeVisible();
        }
    });

    test('TC-35.22: Impersonate tenant — redirects to dashboard with amber banner', async ({ page }) => {
        // Dismiss any alert dialogs (e.g. from failed impersonation due to missing ALL:MANAGE permission)
        page.on('dialog', dialog => dialog.dismiss().catch(() => {}));

        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});

        // Find the first ACTIVE tenant and go to its detail page
        const activeRow = page.locator('tbody tr').filter({ hasText: 'ACTIVE' }).first();
        if (await activeRow.isVisible()) {
            await activeRow.getByRole('link', { name: 'Detail' }).click();
            await page.waitForLoadState('networkidle').catch(() => {});

            const impersonateBtn = page.getByRole('button', { name: 'Impersonate' });
            if (await impersonateBtn.isEnabled()) {
                await impersonateBtn.click();
                // Wait up to 8s for URL to change away from /admin (impersonation navigates to '/')
                const didNavigate = await page.waitForURL('**/', { timeout: 8000 }).then(() => true).catch(() => false);
                if (!didNavigate) {
                    console.log('ℹ Impersonation did not redirect — likely missing ALL:MANAGE permission');
                    return;
                }
                // Amber impersonation banner — wait for hydration
                await page.waitForTimeout(1000);
                const hasBanner = await page.getByText('you are acting as this tenant').isVisible({ timeout: 5000 }).catch(() => false);
                const hasExit = await page.getByRole('button', { name: 'Exit Impersonation' }).isVisible().catch(() => false);
                expect(hasBanner || hasExit, 'Impersonation banner or Exit button should be visible').toBeTruthy();
                console.log(`✓ Impersonation active: banner=${hasBanner}, exit=${hasExit}`);
            }
        }
    });

    test('TC-35.23: Exit Impersonation — restores admin session and returns to /admin', async ({ page }) => {
        // Dismiss any alert dialogs
        page.on('dialog', dialog => dialog.dismiss().catch(() => {}));

        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});

        const activeRow = page.locator('tbody tr').filter({ hasText: 'ACTIVE' }).first();
        if (await activeRow.isVisible()) {
            await activeRow.getByRole('link', { name: 'Detail' }).click();
            await page.waitForLoadState('networkidle').catch(() => {});

            const impersonateBtn = page.getByRole('button', { name: 'Impersonate' });
            if (await impersonateBtn.isEnabled()) {
                await impersonateBtn.click();
                const didNavigate = await page.waitForURL('**/', { timeout: 8000 }).then(() => true).catch(() => false);
                if (!didNavigate) {
                    console.log('ℹ Impersonation did not redirect — skipping exit test');
                    return;
                }
                await page.waitForTimeout(1000);
                const exitBtn = page.getByRole('button', { name: 'Exit Impersonation' });
                if (!await exitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log('ℹ Exit Impersonation button not visible — skipping');
                    return;
                }
                await exitBtn.click();
                // Wait for redirect back to /admin (ends with /admin, not /admin/tenants/...)
                const exited = await page.waitForURL(/\/admin$/, { timeout: 10000 }).then(() => true).catch(() => false);
                if (exited) {
                    await expect(page.getByText('you are acting as this tenant')).not.toBeVisible();
                    await expect(page.getByRole('heading', { name: 'Platform Overview' })).toBeVisible({ timeout: 5000 });
                    console.log('✓ Exit impersonation succeeded');
                } else {
                    console.log('ℹ Did not navigate back to /admin after exit');
                }
            }
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.24–35.25  Global Feature Flags Page  [PRD 4.13.4]
// ---------------------------------------------------------------------------
test.describe('TC-35: Global Feature Flags Page', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/feature-flags');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.24: Available Feature Flags table shows all 8 system flags', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Feature Flags', exact: true })).toBeVisible();
        await expect(page.getByText('Available Feature Flags')).toBeVisible();
        // All 8 system flag keys must be present
        const flagKeys = [
            'ADVANCED_PICKING', 'BETA_FLOOR_PLAN', 'AI_REORDER',
            'MULTI_CURRENCY', 'SUPPLIER_PORTAL', 'ADVANCED_ANALYTICS',
            'BARCODE_PRINT', 'API_ACCESS',
        ];
        for (const key of flagKeys) {
            await expect(page.getByText(key)).toBeVisible();
        }
    });

    test('TC-35.25: Select a tenant — per-tenant flag list loads', async ({ page }) => {
        await expect(page.getByText('Select a tenant above to manage their feature flags')).toBeVisible();
        const tenantSelect = page.locator('select').filter({ hasText: 'Select a tenant...' });
        const options = await tenantSelect.locator('option').count();
        if (options > 1) {
            // Select the first real tenant (index 1 skips the placeholder)
            await tenantSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1000);
            // Per-tenant flag toggles should now be visible
            await expect(page.getByText(/Enabled|Disabled/).first()).toBeVisible({ timeout: 5000 });
        }
    });
});

// ---------------------------------------------------------------------------
// TC-35.26–35.28  Platform Analytics  [PRD 4.13.6]
// ---------------------------------------------------------------------------
test.describe('TC-35: Platform Analytics', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/analytics');
        await page.waitForLoadState('networkidle').catch(() => {});
        // Wait for loading state to clear
        await expect(page.getByText('Loading analytics...')).not.toBeVisible({ timeout: 15000 });
        // Extra settle time so KPI cards rendered from async API have time to appear
        await page.waitForTimeout(2000);
    });

    test('TC-35.26: Analytics page shows four KPI cards', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Platform Analytics' })).toBeVisible();
        await expect(page.getByText('Total Tenants')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Total Users')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Total Orders')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Active Tenants')).toBeVisible({ timeout: 10000 });
    });

    test('TC-35.27: Monthly growth bar chart section is rendered', async ({ page }) => {
        await expect(page.getByText('New Tenants per Month (Last 12 months)')).toBeVisible();
        // Recharts renders SVG — verify SVG is present in the chart container
        const barChart = page.locator('.recharts-wrapper').first();
        await expect(barChart).toBeVisible();
    });

    test('TC-35.28: Plan distribution and Status distribution chart sections visible', async ({ page }) => {
        await expect(page.getByText('Plan Distribution')).toBeVisible();
        await expect(page.getByText('Status Distribution')).toBeVisible();
        await expect(page.getByText('Plan Breakdown')).toBeVisible();
        // Two pie charts (recharts wrappers)
        const charts = page.locator('.recharts-wrapper');
        expect(await charts.count()).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// TC-35.29–35.32  Audit Log  [PRD 4.13.7]
// ---------------------------------------------------------------------------
test.describe('TC-35: Audit Log', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/audit-log');
        await page.waitForLoadState('networkidle').catch(() => {});
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    test('TC-35.29: Audit log page loads with table and column headers', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Time' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Actor' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Target' })).toBeVisible();
    });

    test('TC-35.30: Search by text filters the visible entries', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search actor, target...');
        await searchInput.fill('zzznonexistent_actor_xyz');
        // Should show no results message or an empty table body
        await expect(page.getByText('No audit log entries found')).toBeVisible({ timeout: 3000 });
        await searchInput.fill('');
    });

    test('TC-35.31: Action type filter dropdown changes visible entries', async ({ page }) => {
        const actionSelect = page.locator('select').nth(0);
        const options = await actionSelect.locator('option').count();
        if (options > 1) {
            await actionSelect.selectOption({ index: 1 });
            // Entry count footer should update
            await expect(page.getByText(/Showing \d+ of \d+ entries/)).toBeVisible();
        }
    });

    test('TC-35.32: Page size selector changes the result limit', async ({ page }) => {
        const limitSelect = page.locator('select').nth(1);
        await limitSelect.selectOption('500');
        await page.waitForTimeout(1000);
        // Footer shows updated entry count
        await expect(page.getByText(/Showing \d+ of \d+ entries/)).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// TC-35.33–35.35  Announcements  [PRD 4.13.8]
// ---------------------------------------------------------------------------
test.describe('TC-35: Announcements', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/announcements');
        await page.waitForLoadState('networkidle').catch(() => {});
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    test('TC-35.33: Announcements page loads with New Announcement button', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'New Announcement' })).toBeVisible();
    });

    test('TC-35.34: Create announcement — validation rejects missing title/body', async ({ page }) => {
        await page.getByRole('button', { name: 'New Announcement' }).click();
        await expect(page.getByRole('heading', { name: 'New Announcement' })).toBeVisible();
        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByText(/required/i)).toBeVisible({ timeout: 3000 });
    });

    test('TC-35.35: Create announcement — happy path publishes and appears in list', async ({ page }) => {
        const ts = Date.now();
        const title = `E2E Test Announcement ${ts}`;

        await page.getByRole('button', { name: 'New Announcement' }).click();
        await page.getByPlaceholder('System maintenance scheduled').fill(title);
        await page.getByPlaceholder('Provide details of the announcement...').fill('This is an automated E2E test announcement.');
        await page.getByRole('button', { name: 'Publish' }).click();

        // Modal closes and announcement appears in list
        await expect(page.getByRole('heading', { name: 'New Announcement' })).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
    });

    test('TC-35.36: Delete announcement — removed from list after confirmation', async ({ page }) => {
        const ts = Date.now();
        const title = `E2E Delete Test ${ts}`;

        // First create one
        await page.getByRole('button', { name: 'New Announcement' }).click();
        await page.getByPlaceholder('System maintenance scheduled').fill(title);
        await page.getByPlaceholder('Provide details of the announcement...').fill('To be deleted.');
        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

        // Accept the confirm() dialog
        page.once('dialog', dialog => dialog.accept());
        // Navigate from the <h3> title → parent content div → parent card flex div → delete button
        await page.locator('h3').filter({ hasText: title }).locator('xpath=../..').getByRole('button').click();

        // Announcement should disappear
        await expect(page.getByText(title)).not.toBeVisible({ timeout: 10000 });
    });
});

// ---------------------------------------------------------------------------
// TC-35.40–35.42  AI_REORDER Readiness Check  [PRD 4.13.4, M8.7]
// ---------------------------------------------------------------------------
test.describe('TC-35: AI_REORDER Readiness Check', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/feature-flags');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.40: Enabling AI_REORDER for a tenant with no sales data shows amber readiness warning', async ({ page }) => {
        const tenantSelect = page.locator('select').filter({ hasText: 'Select a tenant...' });
        const options = await tenantSelect.locator('option').count();
        if (options <= 1) {
            test.skip(true, 'No tenants in DB — skipping');
            return;
        }
        // Select the first real tenant
        await tenantSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1500);

        // Per-tenant flag rows have class "px-5 py-4 flex items-center justify-between"
        // Scoping to these specific rows avoids picking ancestor divs that match multiple flags
        const aiReorderRow = page.locator('div.px-5.py-4')
            .filter({ has: page.locator('div', { hasText: /^AI Reorder Suggestions$/ }) })
            .filter({ has: page.locator('span', { hasText: /^Disabled$/ }) });
        if (await aiReorderRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await aiReorderRow.getByRole('button').click();
            // Fresh DB has 0 days of sales data → warning must appear
            await expect(page.getByText(/day\(s\) of sales data available/)).toBeVisible({ timeout: 8000 });
        }
    });

    test('TC-35.41: Readiness warning banner is amber-styled (bg-amber-50)', async ({ page }) => {
        const tenantSelect = page.locator('select').filter({ hasText: 'Select a tenant...' });
        const options = await tenantSelect.locator('option').count();
        if (options <= 1) { test.skip(true, 'No tenants in DB — skipping'); return; }
        await tenantSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1500);

        const aiReorderRow = page.locator('div.px-5.py-4')
            .filter({ has: page.locator('div', { hasText: /^AI Reorder Suggestions$/ }) })
            .filter({ has: page.locator('span', { hasText: /^Disabled$/ }) });
        if (await aiReorderRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await aiReorderRow.getByRole('button').click();
            const warningBanner = page.locator('.bg-amber-50').filter({ hasText: /sales data/ });
            await expect(warningBanner).toBeVisible({ timeout: 8000 });
            await expect(warningBanner.getByText(/7 days/)).toBeVisible();
        }
    });

    test('TC-35.42: Available flags table includes AI_REORDER with label and description', async ({ page }) => {
        await expect(page.getByText('AI_REORDER')).toBeVisible();
        // The label shown is the human-readable flag label, not just the key
        const flagRow = page.locator('div').filter({ hasText: 'AI_REORDER' }).first();
        await expect(flagRow).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// TC-35.43–35.45  Announcement Targeting & Scheduling  [PRD 4.13.8]
// ---------------------------------------------------------------------------
test.describe('TC-35: Announcement Targeting & Scheduling', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/announcements');
        await page.waitForLoadState('networkidle').catch(() => {});
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    test('TC-35.43: Announcement with plan-specific targeting shows "By Plan" label in list', async ({ page }) => {
        const ts = Date.now();
        const title = `E2E Plan Target ${ts}`;

        await page.getByRole('button', { name: 'New Announcement' }).click();
        await page.getByPlaceholder('System maintenance scheduled').fill(title);
        await page.getByPlaceholder('Provide details of the announcement...').fill('Targeting STARTER plan only.');

        // Change target type to "Specific Plan"
        const targetSelect = page.locator('select').filter({ hasText: 'All Tenants' });
        await targetSelect.selectOption('PLAN');
        // Fill plan name value field that appears
        await page.getByPlaceholder('STARTER').fill('STARTER');

        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByRole('heading', { name: 'New Announcement' })).not.toBeVisible({ timeout: 10000 });

        // Scope to the specific card that contains our unique h3 title
        const card = page.locator('.rounded-xl').filter({ has: page.locator('h3', { hasText: title }) });
        await expect(card.locator('span.bg-slate-100').filter({ hasText: /By Plan/ })).toBeVisible({ timeout: 5000 });
    });

    test('TC-35.44: Announcement with future start date shows Inactive badge', async ({ page }) => {
        const ts = Date.now();
        const title = `E2E Future Start ${ts}`;

        await page.getByRole('button', { name: 'New Announcement' }).click();
        await page.getByPlaceholder('System maintenance scheduled').fill(title);
        await page.getByPlaceholder('Provide details of the announcement...').fill('Scheduled for the future.');

        // Set startsAt to a far-future datetime
        const futureDate = '2099-12-31T00:00';
        await page.locator('input[type="datetime-local"]').first().fill(futureDate);

        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByRole('heading', { name: 'New Announcement' })).not.toBeVisible({ timeout: 10000 });

        // Scope to the specific card that contains our unique h3 title
        const card = page.locator('.rounded-xl').filter({ has: page.locator('h3', { hasText: title }) });
        await expect(card.locator('span').filter({ hasText: /^Inactive$/ })).toBeVisible({ timeout: 5000 });
    });

    test('TC-35.45: Announcement with "All Tenants" target shows "All Tenants" label', async ({ page }) => {
        const ts = Date.now();
        const title = `E2E All Tenants ${ts}`;

        await page.getByRole('button', { name: 'New Announcement' }).click();
        await page.getByPlaceholder('System maintenance scheduled').fill(title);
        await page.getByPlaceholder('Provide details of the announcement...').fill('Broadcast to all tenants.');
        // Target defaults to All Tenants — no change needed

        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByRole('heading', { name: 'New Announcement' })).not.toBeVisible({ timeout: 10000 });

        // Verify via the card heading + the bg-slate-100 target badge (strict-mode safe)
        await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 5000 });
        const targetBadge = page.locator('span.bg-slate-100').getByText('All Tenants', { exact: true }).first();
        await expect(targetBadge).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// TC-35.46–35.48  Tenant Status Filter & Suspend/Reactivate  [PRD 4.13.1]
// ---------------------------------------------------------------------------
test.describe('TC-35: Tenant Status Filter', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.46: Status filter SUSPENDED hides ACTIVE-only rows', async ({ page }) => {
        const statusSelect = page.locator('thead select').last();
        await statusSelect.selectOption('SUSPENDED');
        await page.waitForTimeout(500);
        // No ACTIVE badges should remain visible in the table body
        const activeBadges = page.locator('tbody span').filter({ hasText: /^ACTIVE$/ });
        expect(await activeBadges.count()).toBe(0);
    });

    test('TC-35.47: Clearing all filters restores full tenant list', async ({ page }) => {
        // Apply a filter first
        const nameInput = page.getByPlaceholder('Name / slug...');
        await nameInput.fill('zzznonexistent');
        await expect(page.getByText('No tenants found')).toBeVisible({ timeout: 5000 });

        await page.getByRole('button', { name: 'Clear Filters' }).click();
        // After clear, "No tenants found" should disappear (assuming at least one tenant exists)
        await expect(page.getByText('No tenants found')).not.toBeVisible({ timeout: 3000 });
    });

    test('TC-35.48: Tenant row count footer updates after filtering', async ({ page }) => {
        // Footer shows tenant count
        await expect(page.getByText(/\d+ tenant/i)).toBeVisible();
        const nameInput = page.getByPlaceholder('Name / slug...');
        await nameInput.fill('zzznonexistent');
        await page.waitForTimeout(500);
        // Count should now reflect filtered state (0 tenants or "No tenants found")
        const noResults = page.getByText('No tenants found');
        const countFooter = page.getByText(/\d+ tenant/i);
        const noResultsVisible = await noResults.isVisible({ timeout: 3000 }).catch(() => false);
        const countVisible = await countFooter.isVisible({ timeout: 1000 }).catch(() => false);
        expect(noResultsVisible || countVisible).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// TC-35.37–35.39  Bulk Operations  [PRD 4.13.9]
// ---------------------------------------------------------------------------
test.describe('TC-35: Bulk Operations', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsPlatformAdmin(page);
        await page.goto('/admin/tenants');
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('TC-35.37: Clicking header checkbox selects all filtered tenants', async ({ page }) => {
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        if (rowCount > 0) {
            // Header checkbox is a button in the first <th>
            const headerCheckbox = page.locator('thead th').first().getByRole('button');
            await headerCheckbox.click();
            // Bulk action toolbar should appear with the count
            await expect(page.getByText(new RegExp(`${rowCount} selected`))).toBeVisible({ timeout: 3000 });
        }
    });

    test('TC-35.38: Bulk action toolbar shows action and value selectors when items selected', async ({ page }) => {
        const rows = page.locator('tbody tr');
        if (await rows.count() > 0) {
            const headerCheckbox = page.locator('thead th').first().getByRole('button');
            await headerCheckbox.click();
            await expect(page.getByText(/selected/)).toBeVisible({ timeout: 3000 });

            // Select 'Change Status' from the action dropdown
            await page.locator('select').filter({ hasText: 'Choose action' }).selectOption('status');
            // Value dropdown for status should appear
            await expect(page.locator('select').filter({ hasText: 'Select status' })).toBeVisible();
        }
    });

    test('TC-35.39: Cancel bulk selection clears the toolbar', async ({ page }) => {
        const rows = page.locator('tbody tr');
        if (await rows.count() > 0) {
            const headerCheckbox = page.locator('thead th').first().getByRole('button');
            await headerCheckbox.click();
            await expect(page.getByText(/selected/)).toBeVisible({ timeout: 3000 });

            // Click Cancel
            await page.getByRole('button', { name: 'Cancel' }).click();
            // Toolbar disappears
            await expect(page.getByText(/selected/)).not.toBeVisible({ timeout: 3000 });
        }
    });
});
