import { test, expect } from '@playwright/test';
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

test.describe('Stock Rotation Policies', () => {
    test.describe.configure({ mode: 'serial' });

    let warehouseId: string;
    let productIdStandard: string;
    let productIdPerishable: string;
    let customerId: string;
    let userId: string;

    test.beforeAll(async () => {
        // Clean up previous runs if any
        await prisma.rotationRule.deleteMany();

        // 0. Setup Company ID (No Model exists)
        const companyId = `Comp_${Date.now()}_${Math.random()}`;

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

        // 1. Setup Warehouse
        const wh = await prisma.warehouse.create({
            data: {
                name: `RotationWH_${Date.now()}_${Math.random()}`,
                shortName: `RWH${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                address: '123 Rotation St',
                companyId: companyId,
                location: JSON.stringify({}),
                type: 'PHYSICAL',
                viewLocation: { create: { name: `View_${Date.now()}_${Math.random()}`, type: 'VIEW', structuralType: 'WAREHOUSE' } }
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
    }

    test('Scenario 1: Default FIFO (Oldest First)', async ({ request }) => {
        // No rules exist. Should pick B1 (Jan 1) over B2 (Jun 1)
        // Since we can't easily inspect internal allocation via public API without creating a real order flow
        // We will invoke the "Simulate" or "Moves" logic if possible, or just create a mock order.
        // Actually, let's create a *Transfer* or *Move* that triggers the logic?
        // Wait, the logic is in PickingStrategyService.allocateStock.
        // This is typically called during Order Creation / Confirmation.
        // Let's create an Order via API.

        const response = await request.post('http://localhost:3001/orders', {
            headers: { 'x-user-id': userId },
            data: {
                customerId,
                warehouseId,
                priority: 'Normal',
                items: [{ productId: productIdStandard, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);
        const order = await response.json();

        // The service logic *Reserves* stock. We can check the batches.
        // We expect B1 (Oldest) to be reserved.

        // We need to know which batch is B1. Since we created them dynamically, let's query by date.
        const batches = await prisma.inventoryBatch.findMany({
            where: { productId: productIdStandard },
            orderBy: { createdAt: 'asc' }
        });
        const olderBatch = batches[0];
        const newerBatch = batches[1];

        // Re-fetch to check reservation
        const b1Reload = await prisma.inventoryBatch.findUnique({ where: { id: olderBatch.id } });
        const b2Reload = await prisma.inventoryBatch.findUnique({ where: { id: newerBatch.id } });

        expect(b1Reload?.reserved).toBe(10);
        expect(b2Reload?.reserved).toBe(0);
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
        const response = await request.post('http://localhost:3001/orders', {
            headers: { 'x-user-id': userId },
            data: {
                customerId,
                warehouseId,
                priority: 'Normal',
                items: [{ productId: productIdStandard, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);

        // Expect B2 (Newer) to be reserved this time (incremented)
        // Note: Previous test reserved 10 from B1.

        const batches = await prisma.inventoryBatch.findMany({
            where: { productId: productIdStandard },
            orderBy: { createdAt: 'asc' }
        });
        const olderBatch = batches[0]; // B1
        const newerBatch = batches[1]; // B2

        // Check delta
        expect(newerBatch.reserved).toBe(10);
        // Older batch should still have 10 from previous test
        expect(olderBatch.reserved).toBe(10);
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

        const response = await request.post('http://localhost:3001/orders', {
            headers: { 'x-user-id': userId },
            data: {
                customerId,
                warehouseId,
                priority: 'Normal',
                items: [{ productId: productIdPerishable, quantity: 10 }]
            }
        });
        expect(response.status()).toBe(201);

        const batches = await prisma.inventoryBatch.findMany({
            where: { productId: productIdPerishable },
            orderBy: { expiryDate: 'asc' }
        });
        const soonBatch = batches[0]; // B3
        const laterBatch = batches[1]; // B4

        expect(soonBatch.reserved).toBe(0); // SKIPPED due to shelf life
        expect(laterBatch.reserved).toBe(10); // SELECTED
    });
});
