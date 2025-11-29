import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Warehouses ---');
    const warehouses = await prisma.warehouse.findMany();
    console.log(JSON.stringify(warehouses, null, 2));

    console.log('\n--- Products ---');
    const products = await prisma.product.findMany();
    console.log(JSON.stringify(products, null, 2));

    console.log('\n--- Locations ---');
    const locations = await prisma.location.findMany();
    console.log(JSON.stringify(locations, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
