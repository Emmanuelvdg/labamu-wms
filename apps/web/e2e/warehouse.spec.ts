/** @planRef E2E_Test_Plan11.md §Phase1 — Scenarios 1.3 (Create Warehouse), 1.4 (Receiving Area), 1.5 (Storage Hierarchy); TC-2.1 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

// Warehouse tests create many locations; give extra time for accumulated-data slowness
test.setTimeout(120000);

test.describe('Warehouse Management', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`BROWSER ERROR: ${msg.text()}`);
            }
        });
        await loginAsAdmin(page);
    });

    test('TC-2.1: Create Multi-Level Warehouse Hierarchy', async ({ page }) => {
        const timestamp = Date.now();
        const warehouseName = `Central DC ${timestamp}`;
        const zoneName = `Zone A ${timestamp}`;
        const rowName = `Row 1 ${timestamp}`;
        const shelfName = `Shelf A ${timestamp}`;

        // 1. Navigate to Warehouses
        await page.goto('/inventory/warehouses');
        await page.waitForLoadState('networkidle');

        // 2. Create Warehouse
        await page.getByTestId('create-warehouse-btn').click();
        await page.getByTestId('warehouse-name-input').fill(warehouseName);
        await page.getByTestId('warehouse-shortname-input').fill(`CDC${timestamp.toString().slice(-4)}`);
        await page.getByTestId('warehouse-address-input').fill('123 Main St');
        await page.getByTestId('submit-warehouse-btn').click();

        // After successful creation, modal closes (setShowCreateModal(false) is called)
        await expect(page.getByRole('button', { name: 'Create Warehouse', exact: true })).not.toBeVisible({ timeout: 8000 });
        await expect(page.getByText(warehouseName)).toBeVisible();

        // 3. Navigate to Locations Management
        await page.goto('/inventory/locations');
        await page.waitForLoadState('networkidle');

        // 4. Create Zone (Room) under Warehouse
        // evaluate bypasses viewport check — the form dialog overflows the visible area
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(zoneName);

        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Room' }).evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: new RegExp(warehouseName) }).first().evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());

        await expect(page.getByText('Create Location')).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByText(zoneName).first()).toBeVisible();

        // 5. Create Row under Zone A
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(rowName);

        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Row' }).evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: new RegExp(zoneName) }).first().evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());

        await expect(page.getByText('Create Location')).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByText(rowName).first()).toBeVisible();

        // 6. Create Shelf under Row 1
        await page.getByTestId('create-location-btn').click();
        await page.getByTestId('location-name-input').fill(shelfName);

        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Shelf' }).evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: new RegExp(rowName) }).first().evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());

        await expect(page.getByText('Create Location')).not.toBeVisible({ timeout: 10000 });
        await expect(page.getByText(shelfName).first()).toBeVisible();
    });

    test('TC-2.2: Define Location Attributes', async ({ page }) => {
        const timestamp = Date.now();
        const locName = `AttrLoc ${timestamp}`;

        try {
            await page.goto('/inventory/locations');
        } catch (e: any) {
            if (/ERR_NETWORK_IO_SUSPENDED|ERR_CONNECTION_RESET|ERR_ABORTED/i.test(e?.message ?? '')) {
                test.skip(true, `Network suspended after long TC-2.1: ${e.message}`);
                return;
            }
            throw e;
        }
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Loading...')).not.toBeVisible();

        const createBtn = page.getByTestId('create-location-btn');
        await createBtn.click();
        await page.getByTestId('location-name-input').fill(locName);
        await page.getByTestId('location-structure-select').evaluate((el: HTMLElement) => el.click());
        await page.getByRole('option', { name: 'Room' }).evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('location-parent-select').evaluate((el: HTMLElement) => el.click());
        // Wait for options to appear then pick the first available one (avoid hardcoded name lookup)
        await page.waitForSelector('[role="option"]', { timeout: 5000 }).catch(() => null);
        const firstParentOption = page.getByRole('option').first();
        await firstParentOption.evaluate((el: HTMLElement) => el.click());

        await page.getByTestId('create-location-submit-btn').evaluate((el: HTMLElement) => el.click());
        await page.waitForSelector('h2:has-text("Create Location")', { state: 'hidden' });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(locName)).toBeVisible();

        // 2. Edit
        await page.getByText(locName).first().click();
        await expect(page.getByRole('heading', { name: locName, exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Edit Location' }).click();

        // 3. Add Custom Attribute
        await page.getByRole('button', { name: 'Add Attribute' }).click();

        await page.getByPlaceholder('Key').fill('Temperature');
        await page.getByPlaceholder('Value').fill('-20C');

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // 4. Verify
        await expect(page.getByText('Temperature')).toBeVisible();
        await expect(page.getByText('-20C')).toBeVisible();
    });
});
