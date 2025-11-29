import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest(name: string, fn: () => Promise<void>) {
    console.log(`\n[TEST] ${name}`);
    try {
        await fn();
        console.log(`[PASS] ${name}`);
    } catch (e) {
        console.error(`[FAIL] ${name}`);
        console.error(e);
    }
}

async function main() {
    console.log('Starting Acceptance Tests...');

    let warehouse1Id: string;
    let warehouse2Id: string;
    let productId: string;

    // 1. Warehouse Management
    await runTest('Scenario 1.1: Create a Physical Warehouse', async () => {
        const warehouse = await prisma.warehouse.create({
            data: {
                name: 'Test Warehouse 1',
                location: JSON.stringify({ address: '123 Test St' }),
                type: 'PHYSICAL',
            },
        });
        warehouse1Id = warehouse.id;
        if (!warehouse.id) throw new Error('Warehouse ID missing');
        console.log('Created Warehouse:', warehouse.name);
    });

    await runTest('Scenario 1.2: Create Second Warehouse (for transfer)', async () => {
        const warehouse = await prisma.warehouse.create({
            data: {
                name: 'Test Warehouse 2',
                location: JSON.stringify({ address: '456 Transfer Ave' }),
                type: 'PHYSICAL',
            },
        });
        warehouse2Id = warehouse.id;
        console.log('Created Warehouse:', warehouse.name);
    });

    // 2. Product Management
    await runTest('Scenario 2.1: Create a Product', async () => {
        const product = await prisma.product.create({
            data: {
                sku: 'PROD-001',
                name: 'Test Product A',
                category: 'General',
                status: 'Active',
            },
        });
        productId = product.id;
        if (!product.id) throw new Error('Product ID missing');
        console.log('Created Product:', product.name);
    });

    // 3. Inventory Operations
    await runTest('Scenario 3.1: Add Stock to Warehouse 1', async () => {
        // We need to create a batch for stock
        const batch = await prisma.inventoryBatch.create({
            data: {
                productId: productId,
                warehouseId: warehouse1Id,
                batchNumber: 'BATCH-001',
                initialQuantity: 100,
                currentQuantity: 100,
                costPerUnit: 10,
                purchaseDate: new Date(),
                status: 'Active',
            },
        });

        // Also update aggregate inventory (as per service logic)
        await prisma.productInventory.create({
            data: {
                productId: productId,
                warehouseId: warehouse1Id,
                quantity: 100,
            },
        });

        console.log('Added 100 units to Warehouse 1');
    });

    await runTest('Scenario 3.2: Transfer Stock (Simulated)', async () => {
        // Simulate transfer logic (decrement source, increment dest)
        // 1. Decrement Source
        await prisma.inventoryBatch.updateMany({
            where: { warehouseId: warehouse1Id, productId: productId },
            data: { currentQuantity: { decrement: 50 } },
        });
        await prisma.productInventory.updateMany({
            where: { warehouseId: warehouse1Id, productId: productId },
            data: { quantity: { decrement: 50 } },
        });

        // 2. Increment Dest
        await prisma.inventoryBatch.create({
            data: {
                productId: productId,
                warehouseId: warehouse2Id,
                batchNumber: 'BATCH-001-TRANS',
                initialQuantity: 50,
                currentQuantity: 50,
                costPerUnit: 10,
                purchaseDate: new Date(),
                status: 'Active',
            },
        });
        await prisma.productInventory.create({
            data: {
                productId: productId,
                warehouseId: warehouse2Id,
                quantity: 50,
            },
        });

        console.log('Transferred 50 units to Warehouse 2');

        // Verify
        const sourceStock = await prisma.productInventory.findFirst({
            where: { warehouseId: warehouse1Id, productId: productId },
        });
        const destStock = await prisma.productInventory.findFirst({
            where: { warehouseId: warehouse2Id, productId: productId },
        });

        if (sourceStock?.quantity !== 50) throw new Error(`Source stock expected 50, got ${sourceStock?.quantity}`);
        if (destStock?.quantity !== 50) throw new Error(`Dest stock expected 50, got ${destStock?.quantity}`);
        console.log('Verification Successful: Source=50, Dest=50');
    });

    console.log('All tests completed.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
