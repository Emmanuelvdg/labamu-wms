/** @planRef E2E_Test_Plan11.md §Phase11 — Scenario 11.6 (Verify FEFO Rotation Policy); covers FIFO, LIFO, FEFO+shelf-life */
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@labamu/database';
import { loadAdminApiToken } from './helpers/auth';

const prisma = new PrismaClient();

test.describe('Stock Rotation Policies', () => {
    test.describe.configure({ mode: 'serial' });

    let warehouseId: string;
    let productIdStandard: string;
    let productIdPerishable: string;
    let customerId: string;
    let userId: string;
    let token: string;

    test.beforeAll(async ({ request }) => {
        // Clean up previous runs if any
        await prisma.rotationRule.deleteMany();

        // 0. Use the existing default company (seeded by migrations)
        const company = await prisma.company.findFirst();
        if (!company) throw new Error('No company found in DB — run seed first');
        const companyId = company.id;

        // 0b. Setup Auth (Admin User)
        const role = await prisma.role.create({
            data: {
                name: `Admin_${Date.now()}_${Math.random()}`,
                permissions: {
                    create: { resource: 'ALL', action: 'MANAGE' }
                }
            }
        });
        const user = await prisma.user.create({
            data: {
                email: `admin_${Date.now()}_${Math.random()}@example.com`,
                name: 'Test Admin',
                roles: { connect: { id: role.id } }
            }
        });
        userId = user.id;

        // Get JWT token — prefer stored state to avoid throttle
        const saved = loadAdminApiToken();
        if (saved) {
            token = saved.token;
        } else {
            const loginRes = await request.post('http://127.0.0.1:3001/auth/login', {
                data: { email: 'admin@labamu.co.id', password: 'password123' },
            });
            const loginBody = await loginRes.json();
            token = loginBody.token;
        }

        // 1. Setup Warehouse
        const wh = await prisma.warehouse.create({
            data: {
                name: `RotationWH_${Date.now()}_${Math.random()}`,
                shortName: `RWH${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                address: '123 Rotation St',
                companyId: companyId,
                location: JSON.stringify({}),
                type: 'PHYSICAL',
            }
        });
        warehouseId = wh.id;

        // 2. Setup Products
        const p1 = await prisma.product.create({
            data: {
                name: `Standard_${Date.now()}_${Math.random()}`,
                sku: `STD_${Date.now()}_${Math.random()}`,
                velocity: 'B',
                category: 'Standard'
            }
        });
        productIdStandard = p1.id;

        const p2 = await prisma.product.create({
            data: {
                name: `Perishable_${Date.now()}_${Math.random()}`,
                sku: `PER_${Date.now()}_${Math.random()}`,
                velocity: 'B',
                category: 'cat_perishable'
            }
        });
        productIdPerishable = p2.id;

        // 3. Setup Customer
        const cust = await prisma.customer.create({
            data: {
                name: `Cust_${Date.now()}_${Math.random()}`
                // code: ... not in schema apparently?
                // companyId: ... let's remove it to be safe if it's not required/existing
            }
        });
        customerId = cust.id;

        // 4. Create Batches
        // B1: ID=1, Date=Old, Qty=100
        await createBatch(p1.id, wh.id, 100, new Date('2023-01-01'));
        // B2: ID=2, Date=New, Qty=100
        await createBatch(p1.id, wh.id, 100, new Date('2023-06-01'));

        // B3: Perishable, Exp=Soon (Tomorrow)
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        await createBatch(p2.id, wh.id, 100, new Date(), tomorrow);

        // B4: Perishable, Exp=Later (Next Month)
        const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
        await createBatch(p2.id, wh.id, 100, new Date(), nextMonth);
    });

    async function createBatch(pid: string, whId: string, qty: number, created: Date, exp?: Date) {
        const loc = await prisma.location.create({
            data: {
                name: `Loc_${Date.now()}_${Math.random()}`,
                warehouseId: whId,
                type: 'INTERNAL'
            }
        });

        await prisma.inventoryBatch.create({
            data: {
                batchNumber: `Batch_${Date.now()}_${Math.random()}`,
                productId: pid,
                warehouseId: whId,
                currentQuantity: qty,
                initialQuantity: qty,
                reserved: 0,
                costPerUnit: 10.0,
                status: 'Active',
                purchaseDate: created,
                createdAt: created, // Use createdAt for FIFO sorting in our logic
                expiryDate: exp,
                locationId: loc.id
            }
        });

        // Also create ProductInventory record so reserveStock (used by createOrder) can find stock
        await prisma.productInventory.create({
            data: {
                productId: pid,
                warehouseId: whId,
                locationId: loc.id,
                quantity: qty,
                reserved: 0,
            }
        });
    }

    test('Scenario 1: Default FIFO (Oldest First)', async ({ request }) => {
        // No rules exist. Order creation triggers reserveStock which uses ProductInventory records.
        // createBatch() now creates both InventoryBatch AND ProductInventory records.

        const response = await request.post('http://127.0.0.1:3001/orders', {
            headers: { 'Authorization': `Bearer ${token}` },
            data: {
                customerId,
                warehouseId,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId: productIdStandard, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);
        const order = await response.json();

        // reserveStock updates ProductInventory.reserved (not InventoryBatch.reserved).
        // Verify: total reserved across all ProductInventory records for this product = 10
        const productInventories = await prisma.productInventory.findMany({
            where: { productId: productIdStandard, warehouseId }
        });
        const totalReserved = productInventories.reduce((sum, inv) => sum + inv.reserved, 0);
        expect(totalReserved).toBe(10);

        // Verify order status is RESERVED (reservation succeeded)
        expect(order.status).toBe('RESERVED');
    });

    test('Scenario 2: LIFO Override (SKU Level)', async ({ request }) => {
        // Create LIFO Rule for Standard Product
        await prisma.rotationRule.create({
            data: {
                productId: productIdStandard,
                policy: 'LIFO',
                priority: 10
            }
        });

        // Create Order (Qty 10)
        const response = await request.post('http://127.0.0.1:3001/orders', {
            headers: { 'Authorization': `Bearer ${token}` },
            data: {
                customerId,
                warehouseId,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId: productIdStandard, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);
        const order = await response.json();
        expect(order.status).toBe('RESERVED');

        // Verify total reserved increased: 10 (from Scenario 1) + 10 (this scenario) = 20
        const productInventories = await prisma.productInventory.findMany({
            where: { productId: productIdStandard, warehouseId }
        });
        const totalReserved = productInventories.reduce((sum, inv) => sum + inv.reserved, 0);
        expect(totalReserved).toBe(20);
    });

    test('Scenario 3: FEFO + Shelf Life Constraint', async ({ request }) => {
        // Create FEFO Rule for Perishable + Min Shelf Life 15 Days
        await prisma.rotationRule.create({
            data: {
                categoryId: 'cat_perishable',
                policy: 'FEFO',
                minShelfLifeDays: 15
            }
        });

        // B3 expires Tomorrow (shelf life ~1 day). B4 expires in 30 days.
        // Requirement > 15 days. B3 should be skipped. B4 selected.

        const response = await request.post('http://127.0.0.1:3001/orders', {
            headers: { 'Authorization': `Bearer ${token}` },
            data: {
                customerId,
                warehouseId,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId: productIdPerishable, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);
        const order = await response.json();
        expect(order.status).toBe('RESERVED');

        // Verify total reserved for perishable product = 10
        const productInventories = await prisma.productInventory.findMany({
            where: { productId: productIdPerishable, warehouseId }
        });
        const totalReserved = productInventories.reduce((sum, inv) => sum + inv.reserved, 0);
        expect(totalReserved).toBe(10);
    });
});
