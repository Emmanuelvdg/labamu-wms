const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    console.log('=== Phase 11 Setup ===');

    try {
        const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } });
        const warehouse = await prisma.warehouse.findFirst();
        const bin01 = await prisma.location.findFirst({ where: { name: 'Bin 01', warehouseId: warehouse.id } });

        if (!product || !bin01) {
            console.log('Missing product or bin01');
            return;
        }

        // 0. Cleanup old batches to avoid unique constraint violations
        console.log('Cleaning up old test batches...');
        await prisma.inventoryBatch.deleteMany({
            where: { batchNumber: { in: ['BATCH-OLD', 'BATCH-NEW-FEFO'] } }
        });

        // 1. Ensure Bin 01 has FIFO removal strategy
        await prisma.location.update({
            where: { id: bin01.id },
            data: { removalStrategy: 'FIFO' }
        });

        // 2. Create two batches in Bin 01 with different dates
        console.log('Creating test batches in Bin 01...');

        // Batch 1: Oldest
        await prisma.inventoryBatch.create({
            data: {
                productId: product.id,
                locationId: bin01.id,
                warehouseId: warehouse.id,
                batchNumber: 'BATCH-OLD',
                initialQuantity: 10,
                currentQuantity: 10,
                costPerUnit: 100,
                purchaseDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-01-01'),
                status: 'Active'
            }
        });

        // Batch 2: Newest but earlier expiry
        await prisma.inventoryBatch.create({
            data: {
                productId: product.id,
                locationId: bin01.id,
                warehouseId: warehouse.id,
                batchNumber: 'BATCH-NEW-FEFO',
                initialQuantity: 10,
                currentQuantity: 10,
                costPerUnit: 110,
                purchaseDate: new Date('2024-02-01'),
                expiryDate: new Date('2024-12-01'), // Earlier than BATCH-OLD
                status: 'Active'
            }
        });

        // 3. Update Aggregate Inventory
        const existingInv = await prisma.productInventory.findFirst({
            where: {
                productId: product.id,
                locationId: bin01.id,
                warehouseId: warehouse.id
            }
        });

        if (existingInv) {
            await prisma.productInventory.update({
                where: { id: existingInv.id },
                data: { quantity: { increment: 20 } }
            });
        } else {
            await prisma.productInventory.create({
                data: {
                    productId: product.id,
                    locationId: bin01.id,
                    warehouseId: warehouse.id,
                    quantity: 20
                }
            });
        }

        console.log('Setup complete.');

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
