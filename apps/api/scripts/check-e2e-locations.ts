
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking E2E Warehouse Locations ---');

    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (!warehouse) {
        console.log('Warehouse DC1 not found');
        return;
    }

    console.log(`Warehouse: ${warehouse.name} (${warehouse.id})`);

    const locations = await prisma.location.findMany({
        where: { warehouseId: warehouse.id }
    });

    if (locations.length === 0) {
        console.log('No locations found.');
    } else {
        locations.forEach(loc => {
            console.log(`- Location: ${loc.name} (Type: ${loc.type})`);
        });
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
