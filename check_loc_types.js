const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    const warehouses = await prisma.warehouse.findMany({
        include: { viewLocation: true }
    });
    console.log('Warehouses and their View Locations:');
    warehouses.forEach(w => {
        console.log(`- ${w.name}: viewLocationId=${w.viewLocationId}, structuralType=${w.viewLocation?.structuralType}`);
    });

    const allLocations = await prisma.location.findMany();
    console.log('\nAll Locations:');
    allLocations.forEach(l => {
        console.log(`- ${l.name}: id=${l.id}, structuralType=${l.structuralType}, type=${l.type}`);
    });

    await prisma.$disconnect();
}

run().catch(console.error);
