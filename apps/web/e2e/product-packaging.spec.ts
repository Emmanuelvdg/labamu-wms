
import { test, expect } from '@playwright/test';
// import { seedE2EData } from '../../api/scripts/seed_e2e_data';

test.describe('Product Packaging UI', () => {
    test.beforeAll(async () => {
        // Ensure we have the base data
        try {
            // We can't easily run the seed script directly from here without ts-node and environment setup usually
            // But for now we assume the environment is already seeded or we can use the UI to navigate.
            // If needed we can call an API endpoint.
        } catch (e) {
            console.log('Seeding might have failed or skipped', e);
        }
    });

    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@labamu.co.id');
        await page.fill('input[type="password"]', 'admin');

        // Wait for the login response to ensure network is done
        const loginResponsePromise = page.waitForResponse(response =>
            response.url().includes('/auth/login') && (response.status() === 201 || response.status() === 200)
        );

        await page.click('button[type="submit"]');

        try {
            await loginResponsePromise;
        } catch (e) {
            console.log('Login request might have been different or fast', e);
        }

        // Check if we are at root or dashboard, then force dashboard to be safe
        await page.waitForURL(/.*\/$|.*\/dashboard/);
        await page.goto('/dashboard');
    });

    test('should allow creating a Pallet packaging with Ti-Hi', async ({ page }) => {
        // 1. Navigate to Products
        await page.click('text=Inventory');
        await page.click('text=Products');

        // 2. Select the E2E Test Product
        await page.fill('input[placeholder*="Search"]', 'E2E Test Product');
        await page.waitForTimeout(1000);

        // Click the arrow link in the row containing the product
        await page.locator('tr', { hasText: 'E2E Test Product' }).getByRole('link').click();

        // 3. Navigate to Packaging
        await page.click('text=Manage Packaging');

        // 4. Fill in New Unit Form
        await page.fill('input[placeholder="e.g. Box of 12"]', 'E2E Pallet');

        // Select Type = PALLET
        await page.click('button[role="combobox"]'); // Assuming the first select is Type
        // This selector is risky. Let's look at the label.
        // Finding the Select trigger near label "Type"
        // Improving selector strategy:
        // We can use the text content since we know the structure or just verify the select exists.
        // Actually, let's use page.getByLabel or similar if possible, but the Select component might not label well.
        // Let's try locating by the placeholder or value.

        // Using a more robust selector relying on the order or distinct elements
        // The previous view_file showed: Label "Type" -> Select
        // We can try to select 'Pallet' from the dropdown.
        // Verify we are on the page
        await expect(page.locator('h1', { hasText: 'Manage Packaging Units' })).toBeVisible();

        // Fill Name first
        await page.fill('input[placeholder="e.g. Box of 12"]', 'E2E Pallet');

        // Select 'Pallet' from the Type dropdown
        // Use force click to bypass potential overlays/toasts or sticky headers
        await page.getByRole('combobox').first().click({ force: true });
        await page.getByRole('option', { name: 'Pallet' }).click();

        // 5. Verify Ti-Hi inputs appear
        await expect(page.locator('text=Ti (Cartons/Layer)')).toBeVisible();
        await expect(page.locator('text=Hi (Layers)')).toBeVisible();

        // 6. Fill Details
        await page.fill('input[value="1"]', '100'); // Quantity
        // Ti
        await page.locator('input').filter({ hasText: /e\.g\. 10/ }).fill('10');
        // Hi
        await page.locator('input').filter({ hasText: /e\.g\. 5/ }).fill('5');

        // Width/Height/Depth/Weight (optional but good to fill)
        // There are many inputs. We need to be specific.
        // The layout has "Width (cm)" inside the "Create New" card and "Base Unit" card.
        // We need to target the one in the "Add New Unit" card.

        // 7. Click Add Unit
        await page.click('button:has-text("Add Unit")');

        // 8. Verify it appears in the list
        await expect(page.locator('text=E2E Pallet')).toBeVisible();
        await expect(page.locator('text=Ti: 10 / Hi: 5')).toBeVisible();
    });
});
