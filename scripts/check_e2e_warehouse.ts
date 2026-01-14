// @ts-nocheck
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for E2E Locations...');
    const locations = await prisma.location.findMany({
        where: {
            name: {
                contains: 'E2E'
            }
        }
    });

    console.log(`Found ${locations.length} locations with 'E2E' in name.`);
    locations.forEach(l => {
        console.log(`- ID: ${l.id}`);
        console.log(`  Name: "${l.name}"`);
        console.log(`  Type: ${l.type}`);
        console.log(`  StructuralType: ${l.structuralType}`);
        console.log(`  ParentId: ${l.parentId}`);
        console.log(`  WarehouseId: ${l.warehouseId}`);
    });

    // Also check Warehouse entity
    const warehouses = await prisma.warehouse.findMany({
        where: {
            name: {
                contains: 'E2E'
            }
        }
    });
    console.log(`\nFound ${warehouses.length} warehouses with 'E2E' in name.`);
    warehouses.forEach(w => {
        console.log(`- ID: ${w.id}`);
        console.log(`  Name: "${w.name}"`);
        console.log(`  ViewLocationId: ${w.viewLocationId}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
