const { PrismaClient } = require('@labamu/database');
const p = new PrismaClient();
async function main() {
    // Check product inventory at Bin 01
    const inv = await p.productInventory.findMany({
        where: { locationId: '6a061fac-5cf3-4514-abe3-2fbb6e939b6d' },
        include: { product: true }
    });
    console.log('=== ProductInventory at Bin 01 ===');
    inv.forEach(i => console.log(`  ${i.product.name}: qty=${i.quantity}, reserved=${i.reserved}`));

    // Check batches at Bin 01
    const batches = await p.inventoryBatch.findMany({
        where: {
            locationId: '6a061fac-5cf3-4514-abe3-2fbb6e939b6d',
            productId: '916d2d47-eab4-46f6-a5f5-e2ab6ceb7c0b',
            status: 'Active',
            currentQuantity: { gt: 0 }
        },
        orderBy: { purchaseDate: 'asc' }
    });
    console.log('\n=== Active Batches for Pro Laptop X at Bin 01 ===');
    if (batches.length === 0) {
        console.log('  NO ACTIVE BATCHES FOUND — This is why scrap fails!');
    }
    batches.forEach(b => console.log(`  Batch ${b.batchNumber}: qty=${b.currentQuantity}, cost=${b.costPerUnit}`));
}
main().catch(console.error).finally(() => p.$disconnect());
