const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    const warehouses = await prisma.warehouse.findMany();
    console.log('Warehouses in DB:');
    warehouses.forEach(w => console.log(`- ${w.name} (${w.id})`));
    await prisma.$disconnect();
}

run().catch(console.error);
