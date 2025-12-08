import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting warehouse restriction patch...');

    // 1. Find the default warehouse (TW)
    let warehouse = await prisma.warehouse.findFirst({
        where: { OR: [{ shortName: 'TW' }, { name: 'Test Warehouse' }] }
    });

    if (!warehouse) {
        console.log('Default warehouse not found. Checking for any warehouse...');
        warehouse = await prisma.warehouse.findFirst();
    }

    if (!warehouse) {
        console.error('No warehouse found! Please create a warehouse first.');
        return;
    }

    console.log(`Using Warehouse: ${warehouse.name} (${warehouse.id})`);

    if (!warehouse.viewLocationId) {
        console.error('Warehouse has no view location!');
        return;
    }

    const rootId = warehouse.viewLocationId;
    console.log(`Root Location ID: ${rootId}`);

    // 2. Find orphan root locations
    const orphans = await prisma.location.findMany({
        where: {
            parentId: null,
            id: { not: rootId }
        }
    });

    console.log(`Found ${orphans.length} orphan root locations.`);

    // 3. Move orphans to the warehouse
    for (const orphan of orphans) {
        console.log(`Moving orphan ${orphan.name} (${orphan.id}) to Warehouse...`);

        // Determine new structural type
        // If it was WAREHOUSE, demote to ROOM. If null, set to ROOM.
        let newType = orphan.structuralType;
        if (!newType || newType === 'WAREHOUSE') {
            newType = 'ROOM';
        }

        await prisma.location.update({
            where: { id: orphan.id },
            data: {
                parentId: rootId,
                structuralType: newType,
                warehouseId: warehouse.id // Ensure it belongs to the warehouse
            }
        });
    }

    console.log('Patch complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
