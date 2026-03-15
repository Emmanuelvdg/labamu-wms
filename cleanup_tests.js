const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    console.log('Cleaning up test data...');

    const centralDC = await prisma.warehouse.findFirst({ where: { name: 'Central DC' } });
    if (centralDC) {
        // Delete all locations for this warehouse
        const delLocs = await prisma.location.deleteMany({
            where: { warehouseId: centralDC.id }
        });
        console.log(`Deleted ${delLocs.count} locations for Central DC.`);

        const delWh = await prisma.warehouse.delete({
            where: { id: centralDC.id }
        });
        console.log(`Deleted warehouse: ${delWh.name}`);
    }

    // Delete LocForAttrs if it exists in another warehouse
    await prisma.location.deleteMany({
        where: { name: 'LocForAttrs' }
    });
    console.log('Cleanup finished.');

    await prisma.$disconnect();
}

run().catch(console.error);
