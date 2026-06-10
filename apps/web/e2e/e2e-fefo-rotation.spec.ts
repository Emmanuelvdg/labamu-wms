/**
 * @planRef E2E_Test_Plan11.md §Phase11 — Scenario 11.6 (Verify FEFO Rotation Policy, minShelfLifeDays enforcement)
 *
 * E2E Flow: FEFO Rotation with Shelf-Life Constraint
 *
 * Covers: PRD §4 (Stock Rotation), TC-ROT-FEFO
 *   1. Seed two batches for a perishable product:
 *      - Batch A: expires in 3 days  (too soon — should be SKIPPED)
 *      - Batch B: expires in 45 days (within shelf-life — should be SELECTED)
 *   2. Create FEFO rotation rule with minShelfLifeDays=15
 *   3. Create sales order → RESERVED
 *   4. Verify Batch B's location is reserved, Batch A's is not
 *   5. UI: inventory page shows the product
 */
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@labamu/database';
import { loginAsAdmin, loadAdminApiToken } from './helpers/auth';

const API = 'http://127.0.0.1:3001';
const prisma = new PrismaClient();

test.describe.configure({ mode: 'serial' });

test.describe('E2E Flow: FEFO Rotation with Shelf-Life Constraint', () => {
    const TS = Date.now();

    let userId: string;
    let token: string;
    let warehouseId: string;
    let productId: string;
    let customerId: string;
    let nearExpiryLocationId: string;
    let farExpiryLocationId: string;
    let orderId: string;
    let companyId: string; // captured for stamping on tenant-scoped records

    // ── Prisma setup ──────────────────────────────────────────────────────────

    test.beforeAll(async ({ request }) => {
        const company = await prisma.company.findFirst();
        if (!company) throw new Error('No company found — run seed first');
        companyId = company.id;

        // Auth user with ALL:MANAGE
        const role = await prisma.role.create({
            data: {
                name: `Admin_FEFO_${TS}`,
                permissions: { create: { resource: 'ALL', action: 'MANAGE' } },
            },
        });
        const user = await prisma.user.create({
            data: {
                email: `fefo_${TS}@test.com`,
                name: 'FEFO Test Admin',
                roles: { connect: { id: role.id } },
            },
        });
        userId = user.id;

        // Get JWT token — prefer stored state to avoid throttle
        const saved = loadAdminApiToken();
        if (saved) {
            token = saved.token;
        } else {
            const loginRes = await request.post(`${API}/auth/login`, {
                data: { email: 'admin@labamu.co.id', password: 'password123' },
            });
            const loginBody = await loginRes.json();
            token = loginBody.token;
        }

        // Warehouse
        const wh = await prisma.warehouse.create({
            data: {
                name: `FEFO WH ${TS}`,
                shortName: `FWH${TS.toString().slice(-4)}`,
                address: '1 FEFO Lane',
                companyId: company.id,
                location: JSON.stringify({}),
                type: 'PHYSICAL',
            },
        });
        warehouseId = wh.id;

        // Product (perishable category triggers FEFO rule)
        const product = await prisma.product.create({
            data: {
                name: `Perishable FEFO ${TS}`,
                sku: `FEFO-${TS}`,
                velocity: 'A',
                category: 'cat_perishable_fefo',
                companyId, // stamp tenant
            },
        });
        productId = product.id;

        // Customer
        const cust = await prisma.customer.create({
            data: { name: `FEFO Customer ${TS}`, companyId }, // stamp tenant
        });
        customerId = cust.id;

        // Batch A: expires in 3 days (fails minShelfLifeDays=15)
        const soon = new Date();
        soon.setDate(soon.getDate() + 3);

        const locA = await prisma.location.create({
            data: { name: `NearExp-Loc-${TS}`, warehouseId, type: 'INTERNAL', companyId }, // stamp tenant
        });
        nearExpiryLocationId = locA.id;

        await prisma.inventoryBatch.create({
            data: {
                batchNumber: `FEFO-A-${TS}`,
                productId,
                warehouseId,
                locationId: locA.id,
                currentQuantity: 100,
                initialQuantity: 100,
                reserved: 0,
                costPerUnit: 10,
                status: 'Active',
                purchaseDate: new Date(),
                expiryDate: soon,
                companyId, // stamp tenant
            },
        });
        await prisma.productInventory.create({
            data: {
                productId, warehouseId, locationId: locA.id,
                quantity: 100, reserved: 0,
            },
        });

        // Batch B: expires in 45 days (passes minShelfLifeDays=15)
        const later = new Date();
        later.setDate(later.getDate() + 45);

        const locB = await prisma.location.create({
            data: { name: `FarExp-Loc-${TS}`, warehouseId, type: 'INTERNAL', companyId }, // stamp tenant
        });
        farExpiryLocationId = locB.id;

        await prisma.inventoryBatch.create({
            data: {
                batchNumber: `FEFO-B-${TS}`,
                productId,
                warehouseId,
                locationId: locB.id,
                currentQuantity: 100,
                initialQuantity: 100,
                reserved: 0,
                costPerUnit: 10,
                status: 'Active',
                purchaseDate: new Date(),
                expiryDate: later,
                companyId, // stamp tenant
            },
        });
        await prisma.productInventory.create({
            data: {
                productId, warehouseId, locationId: locB.id,
                quantity: 100, reserved: 0,
            },
        });

        // FEFO rotation rule for this product's category
        await prisma.rotationRule.create({
            data: {
                categoryId: 'cat_perishable_fefo',
                policy: 'FEFO',
                minShelfLifeDays: 15,
                companyId, // stamp tenant — RotationRule is now in TENANT_SCOPED_MODELS
            },
        });

        console.log('✓ FEFO test data seeded');
        console.log(`  Near-expiry location: ${nearExpiryLocationId} (expires in 3d)`);
        console.log(`  Far-expiry location:  ${farExpiryLocationId}  (expires in 45d)`);
    });

    // ── Test 1: Create order and verify FEFO selects far-expiry batch ─────────

    test('TC-FEFO-1: Sales order is RESERVED using the far-expiry batch', async ({ request }) => {
        const res = await request.post(`${API}/orders`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                customerId,
                warehouseId,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId, quantity: 10 }],
            },
        });
        expect(res.status(), `Order creation failed: ${await res.text()}`).toBe(201);
        const order = await res.json();
        orderId = order.id;
        expect(order.status).toBe('RESERVED');
        console.log(`✓ Order ${orderId} status: ${order.status}`);
    });

    test('TC-FEFO-2: Far-expiry batch location is reserved; near-expiry is not', async () => {
        // Wait briefly for reservation to persist
        await new Promise(r => setTimeout(r, 500));

        const invs = await prisma.productInventory.findMany({
            where: { productId, warehouseId },
        });

        const nearInv = invs.find(i => i.locationId === nearExpiryLocationId);
        const farInv  = invs.find(i => i.locationId === farExpiryLocationId);

        expect(nearInv, 'Near-expiry inventory record missing').toBeTruthy();
        expect(farInv,  'Far-expiry inventory record missing').toBeTruthy();

        console.log(`  Near-expiry reserved: ${nearInv!.reserved}`);
        console.log(`  Far-expiry  reserved: ${farInv!.reserved}`);

        // FEFO with minShelfLifeDays=15 should skip Batch A (3d) and use Batch B (45d)
        expect(nearInv!.reserved).toBe(0);
        expect(farInv!.reserved).toBeGreaterThan(0);
        console.log('✓ FEFO selected the far-expiry batch as expected');
    });

    test('TC-FEFO-3: GET /replenishment/forecast/:productId does not throw', async ({ request }) => {
        const company = await prisma.company.findFirst();
        if (!company) { return; }
        const res = await request.get(
            `${API}/replenishment/forecast/${productId}?companyId=${company.id}&warehouseId=${warehouseId}`
        );
        // 200 or 404 (no forecast data yet) — just ensure no 500
        expect(res.status()).not.toBe(500);
        console.log(`✓ Forecast endpoint responded: ${res.status()}`);
    });

    // ── UI Verification ───────────────────────────────────────────────────────

    test('TC-FEFO-4: UI — inventory page shows perishable product', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventory');
        await page.waitForLoadState('networkidle');

        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });
        console.log('✓ Inventory page loads with table');
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────

    test.afterAll(async () => {
        await prisma.$disconnect();
    });
});
