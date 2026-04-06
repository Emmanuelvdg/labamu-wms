const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    await prisma.inventoryBatch.updateMany({ data: { reserved: 0 } });
    console.log('Reset batch reservations');
}
run().catch(console.error).finally(()=>prisma.$disconnect());
