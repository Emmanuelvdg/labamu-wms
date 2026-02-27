const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    try {
        const warehouses = await prisma.warehouse.findMany();
        console.log("Success! Found " + warehouses.length + " warehouses.");
        console.log(warehouses.map(w => w.name));
    } catch (e) {
        console.error("Error fetching warehouses from Prisma:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
