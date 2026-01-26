
import { PrismaClient, LocationType } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Setting up Receiving Dock 1 ---');

    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (!warehouse) {
        console.error('Error: Warehouse DC1 not found!');
        process.exit(1);
    }

    console.log(`Found Warehouse: ${warehouse.name} (${warehouse.id})`);

    // Check if it already exists
    const existing = await prisma.location.findFirst({
        where: {
            warehouseId: warehouse.id,
            name: 'Receiving Dock 1'
        }
    });

    if (existing) {
        console.log('Receiving Dock 1 already exists.');
        return;
    }

    // Get parent view location if available
    const viewLocation = warehouse.viewLocationId
        ? await prisma.location.findUnique({ where: { id: warehouse.viewLocationId } })
        : null;

    const dock = await prisma.location.create({
        data: {
            name: 'Receiving Dock 1',
            type: 'INTERNAL',
            warehouseId: warehouse.id,
            parentId: viewLocation?.id, // Attach to the warehouse view root
            code: 'RCV-1'
        }
    });

    console.log(`Created Location: ${dock.name} (${dock.id})`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
