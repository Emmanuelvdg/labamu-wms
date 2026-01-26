const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function checkBinInventory() {
    const bin01 = await prisma.location.findFirst({
        where: { name: 'Bin 01' }
    });

    if (!bin01) {
        console.error('Bin 01 not found!');
        return;
    }

    const inventory = await prisma.productInventory.findMany({
        where: { locationId: bin01.id },
        include: { product: true }
    });

    console.log(`Inventory in Bin 01 (${bin01.id}):`);
    inventory.forEach(i => {
        console.log(`- ${i.product.name} (SKU: ${i.product.sku}): ${i.quantity}`);
    });

    if (inventory.length === 0) {
        console.log('No inventory found in Bin 01.');
    }

    await prisma.$disconnect();
}

checkBinInventory();
