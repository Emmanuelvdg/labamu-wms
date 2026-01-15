
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function fixBatches() {
    const warehouseId = 'a076b96b-868c-49a9-bbd1-c54d4470f419'; // E2E Warehouse
    const sku = 'E2E-PROD-NEW';
    const locationId = '01a49489-2690-4bcf-a818-ac1b2416bbc4'; // 'Stock' location (INTERNAL)

    const product = await prisma.product.findUnique({
        where: { sku }
    });

    if (!product) {
        console.error(`Product ${sku} not found!`);
        process.exit(1);
    }

    console.log(`Found product: ${product.name} (${product.id})`);

    // Create the batch
    const batch = await prisma.inventoryBatch.create({
        data: {
            batchNumber: 'BATCH-E2E-001-' + Date.now(), // Unique batch number
            productId: product.id,
            warehouseId: warehouseId,
            locationId: locationId,
            initialQuantity: 500,
            currentQuantity: 500,
            reserved: 110, // Match aggregate
            costPerUnit: product.averageCost || 10.0,
            purchaseDate: new Date(),
            status: 'Active'
        }
    });

    console.log('Created batch:', batch);

    // Verify aggregate matches just in case (optional, but good practice)
    const inventory = await prisma.productInventory.findFirst({
        where: {
            productId: product.id,
            warehouseId: warehouseId
        }
    });

    console.log('Aggregate Inventory:', inventory);
}

fixBatches()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
