
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Inventory Batches for E2E-PROD-NEW ---');

    const product = await prisma.product.findFirst({ where: { sku: 'E2E-PROD-NEW' } });
    if (!product) return;

    const batches = await prisma.inventoryBatch.findMany({
        where: { productId: product.id }
    });

    console.log(`Found ${batches.length} batches.`);

    if (batches.length === 0) {
        console.log('No batches found. Creating a backfill batch from ProductInventory...');

        const inventory = await prisma.productInventory.findMany({
            where: { productId: product.id, quantity: { gt: 0 } }
        });

        for (const inv of inventory) {
            console.log(`Backfilling batch for WH ${inv.warehouseId} Loc ${inv.locationId} Qty ${inv.quantity}`);
            await prisma.inventoryBatch.create({
                data: {
                    batchNumber: `BACKFILL-${Date.now()}`,
                    productId: product.id,
                    warehouseId: inv.warehouseId,
                    locationId: inv.locationId, // This should now be the 'Stock' location we fixed
                    initialQuantity: inv.quantity,
                    currentQuantity: inv.quantity,
                    reserved: inv.reserved,
                    costPerUnit: product.averageCost || 0,
                    status: 'Active',
                    purchaseDate: new Date()
                }
            });
        }
        console.log('Backfill complete.');
    } else {
        console.log('Batches exist. Checking locationIds...');
        batches.forEach(b => console.log(`- Batch ${b.batchNumber}: Loc ${b.locationId}, Qty ${b.currentQuantity}`));
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
