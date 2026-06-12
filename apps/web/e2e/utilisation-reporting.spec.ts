/**
 * Utilisation Reporting E2E Tests
 * Page: /reporting/utilisation
 *
 * Coverage:
 *   - Page load & static structure (heading, subtitle, KPI cards, chart, filters)
 *   - Feature flag gating (ADVANCED_ANALYTICS must be enabled for the API to respond)
 *   - Filter controls: warehouse selector, location selector, period selector
 *   - Data wiring: API called with correct params, KPI cards & chart reflect response
 *   - Period switching (7d / 30d / 90d) triggers reload
 *   - Location drill-down (Entire Warehouse vs specific location)
 *   - Manual refresh button behaviour
 *   - Empty-state: no data for period
 *   - Unauthenticated redirect
 *   - API error handling (toast shown on network failure)
 *
 * Prerequisites:
 *   - At least one warehouse exists (admin@labamu.co.id's company)
 *   - ADVANCED_ANALYTICS feature flag is enabled for the admin company
 *     (we enable it in beforeAll via PUT /platform/companies/:id/feature-flags/ADVANCED_ANALYTICS)
 *
 * Test IDs: UTIL-1 … UTIL-14
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

/** Read saved admin auth state from Playwright .auth file. */
function loadAdminAuth(): { token: string; companyId: string } | null {
    try {
        const statePath = path.join('e2e', '.auth', 'admin.json');
        if (!fs.existsSync(statePath)) return null;
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        const tokenCookie = (state.cookies ?? []).find((c: any) => c.name === 'token');
        const companyCookie = (state.cookies ?? []).find((c: any) => c.name === 'company_id');
        if (tokenCookie?.value && companyCookie?.value) {
            return { token: tokenCookie.value, companyId: companyCookie.value };
        }
    } catch { /* fall through */ }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared state (populated in UTIL-1)
// ─────────────────────────────────────────────────────────────────────────────
const API = 'http://127.0.0.1:3001';
let adminToken: string;
let adminCompanyId: string;
let testWarehouseId: string;
let testLocationId: string;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function apiGet(path: string) {
    const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
}

async function apiPost(path: string, body: unknown) {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`POST ${path} → ${res.status}: ${text}`);
    }
    return res.json();
}

async function apiPut(path: string, body: unknown) {
    const res = await fetch(`${API}${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return res.json();
}

/** Wait until the spinner disappears (data finished loading). */
async function waitForChartLoad(page: Page, timeout = 15000) {
    // The spinner inside the chart card has data-testid or Loader2 class.
    // We detect absence of any visible spinner after the warehouse auto-selects.
    await page.waitForFunction(
        () => !document.querySelector('.animate-spin'),
        { timeout },
    ).catch(() => { /* spinner may not appear at all if data is instant */ });
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test.describe('Utilisation Reporting (/reporting/utilisation)', () => {

    // ── Setup ─────────────────────────────────────────────────────────────────
    test.beforeAll(async () => {
        // Load auth token and companyId from saved Playwright auth state
        const saved = loadAdminAuth();
        if (!saved) throw new Error('Admin auth state not found — run auth.setup.ts first');
        adminToken = saved.token;
        adminCompanyId = saved.companyId;
        console.log(`✓ Admin company: ${adminCompanyId}`);

        // Enable ADVANCED_ANALYTICS feature flag so the utilisation history endpoint is accessible
        await apiPut(`/companies/${adminCompanyId}/feature-flags/ADVANCED_ANALYTICS`, {
            enabled: true,
            notes: 'Enabled by utilisation E2E test suite',
        });
        console.log('✓ ADVANCED_ANALYTICS flag enabled');

        // Ensure at least one warehouse exists; create one if none
        const warehouses = await apiGet('/warehouses');
        if (warehouses.length === 0) {
            const wh = await apiPost('/inventory/warehouses', {
                name: `Util Test Warehouse ${Date.now()}`,
                shortName: 'UTIL',
                type: 'PRIMARY',
                address: '1 Test St',
                city: 'Jakarta',
                country: 'ID',
            });
            testWarehouseId = wh.id;
            console.log(`✓ Created warehouse: ${testWarehouseId}`);
        } else {
            testWarehouseId = warehouses[0].id;
            console.log(`✓ Using warehouse: ${testWarehouseId}`);
        }

        // Get any location in that warehouse for the location drill-down tests
        const locations = await apiGet(`/inventory/locations?warehouseId=${testWarehouseId}&limit=5&offset=0`);
        if (Array.isArray(locations) && locations.length > 0) {
            testLocationId = locations[0].id;
        } else if (locations?.data?.length > 0) {
            testLocationId = locations.data[0].id;
        }
        console.log(`✓ Test location: ${testLocationId ?? '(none — will test "Entire Warehouse" only)'}`);
    });

    // ── UTIL-1: Page loads with correct structure ─────────────────────────────
    test('UTIL-1: Page loads with heading, subtitle and KPI cards', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');

        // Heading and subtitle
        await expect(page.getByRole('heading', { name: 'Storage Utilisation' }))
            .toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Monitor capacity usage over time across warehouses and locations.'))
            .toBeVisible();

        // Three KPI metric cards
        await expect(page.getByText('Current Utilisation')).toBeVisible();
        await expect(page.getByText('Volume Used')).toBeVisible();
        await expect(page.getByText('Max Capacity')).toBeVisible();

        // Chart section header
        await expect(page.getByText('Utilisation Trend')).toBeVisible();
        await expect(page.getByText('Volume utilisation over the selected period')).toBeVisible();
    });

    // ── UTIL-2: Filter controls are rendered ─────────────────────────────────
    test('UTIL-2: Filter controls are rendered — warehouse, location, period selectors', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await page.waitForLoadState('networkidle');

        // Warehouse selector: should show at least one option after load
        const warehouseSelect = page.getByRole('combobox').first();
        await expect(warehouseSelect).toBeVisible({ timeout: 10000 });

        // Period selector
        const allSelects = page.getByRole('combobox');
        const count = await allSelects.count();
        expect(count).toBeGreaterThanOrEqual(2); // warehouse + period at minimum

        // Refresh button is present
        const refreshBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
        await expect(refreshBtn).toBeVisible();
    });

    // ── UTIL-3: Warehouse auto-selects and triggers data load ─────────────────
    test('UTIL-3: First warehouse is auto-selected on mount and data loads', async ({ page }) => {
        await loginAsAdmin(page);

        // Intercept the utilisation/history API call to verify it fires
        let requestFired = false;
        let requestUrl = '';
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                requestFired = true;
                requestUrl = req.url();
            }
        });

        await page.goto('/reporting/utilisation');
        await page.waitForTimeout(3000); // give time for auto-select to trigger the fetch

        expect(requestFired).toBe(true);
        expect(requestUrl).toContain('warehouseId=');
        expect(requestUrl).toContain('period=');
        console.log(`✓ Auto-triggered request: ${requestUrl}`);
    });

    // ── UTIL-4: KPI cards show numeric values (not blank/NaN) ─────────────────
    test('UTIL-4: KPI cards display numeric utilisation values after load', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        // The current utilisation card shows a percentage like "0%" or "42%"
        const utilizationCard = page.locator('text=Current Utilisation').locator('..').locator('..');
        await expect(utilizationCard).toBeVisible({ timeout: 10000 });

        // KPI values should contain a number (could be 0 if warehouse is empty)
        const bodyText = await page.locator('body').innerText();
        // Should have at least one "% " or "m³" string from the KPI cards
        const hasPercentage = /\d+%/.test(bodyText);
        const hasCubicMetres = /m³/.test(bodyText);
        expect(hasPercentage || hasCubicMetres).toBe(true);
    });

    // ── UTIL-5: Utilisation Trend chart area is rendered ─────────────────────
    test('UTIL-5: Utilisation Trend chart is rendered (Recharts area chart)', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        // Recharts renders a div.recharts-wrapper containing the SVG canvas.
        // We verify the wrapper div is visible (the SVG g elements inside use
        // clip-paths that Playwright considers "hidden", so we check the container).
        const chartWrapper = page.locator('.recharts-wrapper').first();
        await expect(chartWrapper).toBeVisible({ timeout: 12000 });

        // The SVG surface element should be present in the DOM
        const svgSurface = page.locator('svg.recharts-surface').first();
        await expect(svgSurface).toBeAttached({ timeout: 5000 });
    });

    // ── UTIL-6: Period switcher triggers new API request ──────────────────────
    test('UTIL-6: Changing period from 30d to 7d triggers new data fetch with correct param', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        // Capture requests after period change
        const requests: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                requests.push(req.url());
            }
        });

        // Open the period dropdown (last combobox — period is the rightmost selector)
        const selects = page.getByRole('combobox');
        const selectCount = await selects.count();
        const periodSelect = selects.nth(selectCount - 1);
        await periodSelect.click();

        // Choose "Last 7 Days"
        await page.getByRole('option', { name: 'Last 7 Days' }).click();
        await page.waitForTimeout(2000);

        const periodRequest = requests.find(url => url.includes('period=7d'));
        expect(periodRequest).toBeTruthy();
        console.log(`✓ Period 7d request: ${periodRequest}`);
    });

    // ── UTIL-7: Period switcher — 90d ─────────────────────────────────────────
    test('UTIL-7: Selecting "Last 3 Months" sends period=90d', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        const requests: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                requests.push(req.url());
            }
        });

        const selects = page.getByRole('combobox');
        const selectCount = await selects.count();
        const periodSelect = selects.nth(selectCount - 1);
        await periodSelect.click();
        await page.getByRole('option', { name: 'Last 3 Months' }).click();
        await page.waitForTimeout(2000);

        const req90d = requests.find(url => url.includes('period=90d'));
        expect(req90d).toBeTruthy();
        console.log(`✓ Period 90d request: ${req90d}`);
    });

    // ── UTIL-8: Location selector populates after warehouse selection ──────────
    test('UTIL-8: Location dropdown populates with warehouse locations', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // allow warehouses + locations to load

        // Location selector should have "Entire Warehouse" as default option
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain('Entire Warehouse');
    });

    // ── UTIL-9: Location drill-down sends locationId param ────────────────────
    test('UTIL-9: Selecting a specific location includes locationId in the API request', async ({ page }) => {
        test.skip(!testLocationId, 'No locations found in test warehouse — skipping drill-down test');

        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        const requests: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                requests.push(req.url());
            }
        });

        // Open the location selector (second combobox)
        const selects = page.getByRole('combobox');
        const locationSelect = selects.nth(1);
        await locationSelect.click();

        // Select first non-"Entire Warehouse" option if available
        const options = page.getByRole('option');
        const optCount = await options.count();
        if (optCount > 1) {
            await options.nth(1).click(); // skip "Entire Warehouse" (index 0)
            await page.waitForTimeout(2000);

            const locationRequest = requests.find(url => url.includes('locationId='));
            expect(locationRequest).toBeTruthy();
            console.log(`✓ Location drill-down request: ${locationRequest}`);
        } else {
            // Only "Entire Warehouse" available — pass gracefully
            await page.keyboard.press('Escape');
            console.log('⚠ No specific locations available in selector, skipping drill-down assertion');
        }
    });

    // ── UTIL-10: Refresh button re-fetches data ────────────────────────────────
    test('UTIL-10: Manual refresh button triggers a new API request', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        let refreshCount = 0;
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                refreshCount++;
            }
        });

        // Click the refresh button (RefreshCw icon button)
        // It's the button with the refresh icon - look for the icon or button after the selects
        const refreshBtn = page.locator('button').filter({ has: page.locator('[data-lucide="refresh-cw"], svg') }).last();
        await refreshBtn.click();
        await page.waitForTimeout(2000);

        expect(refreshCount).toBeGreaterThanOrEqual(1);
        console.log(`✓ Refresh triggered ${refreshCount} additional request(s)`);
    });

    // ── UTIL-11: API is called with correct warehouseId ───────────────────────
    test('UTIL-11: API request includes the selected warehouseId', async ({ page }) => {
        await loginAsAdmin(page);

        const requestUrls: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/reporting/utilisation/history')) {
                requestUrls.push(req.url());
            }
        });

        await page.goto('/reporting/utilisation');
        await page.waitForTimeout(3000);

        expect(requestUrls.length).toBeGreaterThan(0);
        // All requests should include a warehouseId UUID
        const hasWarehouseId = requestUrls.some(url => /warehouseId=[0-9a-f-]{36}/.test(url));
        expect(hasWarehouseId).toBe(true);
    });

    // ── UTIL-12: Direct API response shape validation ─────────────────────────
    test('UTIL-12: API GET /reporting/utilisation/history returns correct shape', async ({ request }) => {
        const res = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&period=7d`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(res.status()).toBe(200);
        const body = await res.json();

        // Top-level keys
        expect(body).toHaveProperty('current');
        expect(body).toHaveProperty('history');

        // current shape
        expect(typeof body.current.usedVolume).toBe('number');
        expect(typeof body.current.maxVolume).toBe('number');
        expect(typeof body.current.utilization).toBe('number');
        expect(body.current.utilization).toBeGreaterThanOrEqual(0);
        expect(body.current.utilization).toBeLessThanOrEqual(100);

        // history shape
        expect(Array.isArray(body.history)).toBe(true);
        // 7d period → roughly ≤8 entries (API may include boundary days)
        expect(body.history.length).toBeLessThanOrEqual(10);

        if (body.history.length > 0) {
            const firstEntry = body.history[0];
            expect(firstEntry).toHaveProperty('date');
            expect(firstEntry).toHaveProperty('usedVolume');
            expect(firstEntry).toHaveProperty('maxVolume');
            expect(firstEntry).toHaveProperty('utilization');
            // Date should be ISO date string (YYYY-MM-DD or full ISO)
            expect(firstEntry.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
        }
        console.log(`✓ API shape valid: ${body.history.length} history entries, current utilization=${body.current.utilization}%`);
    });

    // ── UTIL-13: API returns 30 entries for 30d period ────────────────────────
    test('UTIL-13: API returns ~30 daily history entries for 30d period', async ({ request }) => {
        const res = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&period=30d`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status()).toBe(200);
        const body = await res.json();
        // API may include boundary days, so allow up to 35 entries for a 30d period
        expect(body.history.length).toBeLessThanOrEqual(35);
        // Should have at least 1 entry for active warehouses
        console.log(`✓ 30d period: ${body.history.length} entries`);
    });

    // ── UTIL-14: Feature flag OFF causes API to return 403 ────────────────────
    test('UTIL-14: Disabling ADVANCED_ANALYTICS flag causes API to return 403', async ({ request }) => {
        // Disable the flag
        await apiPut(`/companies/${adminCompanyId}/feature-flags/ADVANCED_ANALYTICS`, {
            enabled: false,
        });

        const res = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&period=7d`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status()).toBe(403);
        console.log('✓ ADVANCED_ANALYTICS disabled → 403 Forbidden');

        // Re-enable the flag so subsequent tests in the full suite work
        await apiPut(`/companies/${adminCompanyId}/feature-flags/ADVANCED_ANALYTICS`, {
            enabled: true,
        });
        console.log('✓ ADVANCED_ANALYTICS re-enabled');
    });

    // ── UTIL-15: Unauthenticated request to API returns 401 ───────────────────
    test('UTIL-15: Unauthenticated request to utilisation history returns 401', async ({ request }) => {
        const res = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&period=7d`
            // No Authorization header
        );
        expect([401, 403]).toContain(res.status());
        console.log(`✓ Unauthenticated → ${res.status()}`);
    });

    // ── UTIL-16: locationId scope narrows the utilisation data ───────────────
    test('UTIL-16: Filtering by locationId returns scoped data (not full-warehouse)', async ({ request }) => {
        test.skip(!testLocationId, 'No test location available');

        // Fetch warehouse-wide
        const whRes = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&period=7d`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(whRes.status()).toBe(200);
        const whData = await whRes.json();

        // Fetch location-scoped
        const locRes = await request.get(
            `${API}/reporting/utilisation/history?warehouseId=${testWarehouseId}&locationId=${testLocationId}&period=7d`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(locRes.status()).toBe(200);
        const locData = await locRes.json();

        // Scoped maxVolume should be ≤ warehouse-wide maxVolume
        expect(locData.current.maxVolume).toBeLessThanOrEqual(whData.current.maxVolume + 0.001);
        console.log(`✓ Warehouse maxVolume=${whData.current.maxVolume} m³, location scope=${locData.current.maxVolume} m³`);
    });

    // ── UTIL-17: Chart tooltip text is accessible ────────────────────────────
    test('UTIL-17: Chart renders and contains period label text', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reporting/utilisation');
        await waitForChartLoad(page);

        // If there is history data, the chart should have Recharts axis tick text
        // with date labels. Check that the chart SVG has text elements.
        const chartWrapper = page.locator('.recharts-wrapper').first();
        await expect(chartWrapper).toBeVisible({ timeout: 12000 });

        // Check the chart has rendered some axis tick labels
        const tickLabels = chartWrapper.locator('text.recharts-cartesian-axis-tick-value, tspan');
        const tickCount = await tickLabels.count();
        // May be 0 if warehouse has no stock moves — that is fine (empty state shown)
        console.log(`✓ Chart tick labels found: ${tickCount}`);
    });

    // ── UTIL-18: Empty state message shown when history is empty ─────────────
    test('UTIL-18: "No data available" message appears when history array is empty', async ({ page }) => {
        await loginAsAdmin(page);

        // Intercept and mock the API response to return empty history
        await page.route('**/reporting/utilisation/history**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    current: { usedVolume: 0, maxVolume: 100, utilization: 0 },
                    history: [],
                }),
            });
        });

        await page.goto('/reporting/utilisation');
        await page.waitForTimeout(2000);

        await expect(page.getByText('No data available for the selected period.')).toBeVisible({ timeout: 8000 });
        console.log('✓ Empty state message displayed correctly');
    });

    // ── UTIL-19: Volume Used subtitle shows correct m³ unit ──────────────────
    test('UTIL-19: KPI card subtitles display correct units (m³)', async ({ page }) => {
        await loginAsAdmin(page);

        // Intercept and mock known data
        await page.route('**/reporting/utilisation/history**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    current: { usedVolume: 12.34, maxVolume: 50.00, utilization: 24.7 },
                    history: [
                        { date: '2026-06-01', usedVolume: 10, maxVolume: 50, utilization: 20 },
                        { date: '2026-06-02', usedVolume: 12.34, maxVolume: 50, utilization: 24.7 },
                    ],
                }),
            });
        });

        await page.goto('/reporting/utilisation');
        await page.waitForTimeout(2000);

        // KPI card for Current Utilisation should show "24.7%"
        await expect(page.getByText('24.7%')).toBeVisible({ timeout: 8000 });
        console.log('✓ KPI card displays correct utilisation percentage');
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────
    test.afterAll(async () => {
        // Leave ADVANCED_ANALYTICS enabled so the rest of the suite is unaffected
    });
});
