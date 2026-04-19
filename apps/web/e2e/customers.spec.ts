import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Customers (CRM)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC-CRM-1: Customers list page loads with correct structure', async ({ page }) => {
        await page.goto('/customers');

        await expect(page.getByRole('heading', { name: 'Customers (CRM)' })).toBeVisible();

        // Should show either a list of customers or the "New Customer" button
        const newCustomerBtn = page.getByRole('button', { name: /New Customer/i });
        await expect(newCustomerBtn).toBeVisible();
    });

    test('TC-CRM-2: Create a new customer with name only', async ({ page }) => {
        await page.goto('/customers');

        const timestamp = Date.now();
        const customerName = `E2E Customer ${timestamp}`;

        // Open modal
        await page.getByRole('button', { name: /New Customer/i }).click();

        // Modal should appear with a name field — use placeholder since the label
        // isn't connected to the input via a `for` attribute
        const nameInput = page.getByPlaceholder('Customer Name');
        await expect(nameInput).toBeVisible();
        await nameInput.fill(customerName);

        // Submit
        await page.getByRole('button', { name: /Create|Save|Add/i }).last().click();

        // Customer should appear in the list
        await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 });
    });

    test('TC-CRM-3: Create a customer with full address details', async ({ page }) => {
        await page.goto('/customers');

        const timestamp = Date.now();
        const customerName = `E2E Address Customer ${timestamp}`;

        await page.getByRole('button', { name: /New Customer/i }).click();

        const nameInput = page.getByPlaceholder('Customer Name');
        await nameInput.fill(customerName);

        // Fill optional address fields if visible
        const addressInput = page.getByLabel(/Address/i);
        if (await addressInput.isVisible()) {
            await addressInput.fill('123 Test Street, Jakarta');

            const latInput = page.getByLabel(/Latitude/i);
            const lngInput = page.getByLabel(/Longitude/i);

            if (await latInput.isVisible()) {
                await latInput.fill('-6.200000');
                await lngInput.fill('106.816666');
            }
        }

        await page.getByRole('button', { name: /Create|Save|Add/i }).last().click();

        await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 });
    });

    test('TC-CRM-4: Customer detail page is accessible', async ({ page }) => {
        await page.goto('/customers');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // If there are customers, clicking one should open the detail page
        const customerLinks = page.locator('table tbody tr a, [data-testid="customer-row"]').first();
        const hasCustomers = await customerLinks.count() > 0;

        if (hasCustomers) {
            await customerLinks.click();
            // Should navigate to a customer detail page
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/\/customers\/.+/);
        } else {
            // Empty state is acceptable
            await expect(page.getByText(/No customers|no customers/i)).toBeVisible();
        }
    });

    test('TC-CRM-5: Create customer button validation - empty name', async ({ page }) => {
        await page.goto('/customers');

        await page.getByRole('button', { name: /New Customer/i }).click();

        // The Create button is disabled={!newCustomerName.trim()} — verify it's disabled,
        // not clickable, which prevents accidental empty-name submission.
        const createBtn = page.getByRole('button', { name: 'Create' });
        await expect(createBtn).toBeVisible();
        await expect(createBtn).toBeDisabled();
    });
});
