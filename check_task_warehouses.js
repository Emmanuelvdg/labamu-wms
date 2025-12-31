const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function checkTaskWarehouses() {
    const tasks = await prisma.putawayTask.findMany({
        include: {
            product: true,
            sourceLocation: true,
            destinationLocation: true
        }
    });

    console.log(`Total putaway tasks: ${tasks.length}\n`);

    // Get unique warehouse IDs
    const warehouseIds = [...new Set(tasks.map(t => t.destinationLocation.warehouseId))];
    console.log(`Tasks distributed across ${warehouseIds.length} warehouse(s)\n`);

    // Get warehouse details
    for (const whId of warehouseIds) {
        const wh = await prisma.warehouse.findUnique({ where: { id: whId } });
        const count = tasks.filter(t => t.destinationLocation.warehouseId === whId).length;
        console.log(`✅ ${wh.name}: ${count} tasks`);
        console.log(`   Warehouse ID: ${whId}\n`);
    }

    await prisma.$disconnect();
}

checkTaskWarehouses();
