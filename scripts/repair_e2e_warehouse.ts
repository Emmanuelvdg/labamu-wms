
// @ts-nocheck
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Repairing E2E Warehouse Location ===');

    // 1. Find the E2E Warehouse
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'E2E Warehouse' }
    });

    if (!warehouse) {
        console.error('❌ E2E Warehouse not found in Warehouse table.');
        return;
    }

    console.log(`Found Warehouse: ${warehouse.name} (ID: ${warehouse.id})`);

    // 2. Check if it already has a view location
    if (warehouse.viewLocationId) {
        const loc = await prisma.location.findUnique({ where: { id: warehouse.viewLocationId } });
        if (loc) {
            console.log(`✅ Warehouse already has a valid location: ${loc.name} (ID: ${loc.id})`);
            // Ensure type is correct
            if (loc.structuralType !== 'WAREHOUSE') {
                console.log('Fixing structural type...');
                await prisma.location.update({
                    where: { id: loc.id },
                    data: { structuralType: 'WAREHOUSE' }
                });
            }
            return;
        } else {
            console.log('⚠️ Warehouse has viewLocationId but location record is missing.');
        }
    }

    // 3. Create missing Location
    console.log('Creating missing root Location...');
    const newLoc = await prisma.location.create({
        data: {
            name: warehouse.name,
            type: 'VIEW',
            structuralType: 'WAREHOUSE',
            warehouseId: warehouse.id
        }
    });
    console.log(`✅ Created Location: ${newLoc.name} (ID: ${newLoc.id})`);

    // 4. Update Warehouse
    await prisma.warehouse.update({
        where: { id: warehouse.id },
        data: { viewLocationId: newLoc.id }
    });
    console.log('✅ Updated Warehouse with new viewLocationId');

    // 5. Create default 'Stock' location if needed (standard pattern)
    const stockLoc = await prisma.location.findFirst({
        where: {
            warehouseId: warehouse.id,
            name: 'Stock'
        }
    });

    if (!stockLoc) {
        console.log('Creating default Stock location...');
        await prisma.location.create({
            data: {
                name: 'Stock',
                type: 'INTERNAL',
                parentId: newLoc.id,
                warehouseId: warehouse.id
            }
        });
        console.log('✅ Created Stock location');
    }

    console.log('=== Repair Complete ===');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
