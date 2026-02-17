import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function fixBinWarehouseIds() {
    console.log('🔧 Fixing bin warehouse IDs...\n');

    const warehouseId = 'd32c8528-98df-4341-a29c-c26db7ba7f12';

    // First, check current state
    const binsWithoutWarehouse = await prisma.location.findMany({
        where: {
            OR: [
                { structuralType: 'BAY' },
                { structuralType: 'SHELF' },
                { structuralType: 'POSITION' }
            ],
            warehouseId: null
        }
    });

    console.log(`Found ${binsWithoutWarehouse.length} bins without warehouse ID\n`);

    // Update all bins to have the warehouse ID
    const result = await prisma.location.updateMany({
        where: {
            OR: [
                { structuralType: 'BAY' },
                { structuralType: 'SHELF' },
                { structuralType: 'POSITION' }
            ]
        },
        data: {
            warehouseId: warehouseId
        }
    });

    console.log(`✅ Updated ${result.count} locations with warehouse ID: ${warehouseId}\n`);

    // Verify the fix
    const binsWithWarehouse = await prisma.location.findMany({
        where: {
            warehouseId,
            OR: [
                { structuralType: 'POSITION' },
                { structuralType: 'BIN' },
                { structuralType: 'SHELF' }
            ]
        }
    });

    console.log(`✓ Verified: ${binsWithWarehouse.length} bins now associated with warehouse\n`);

    await prisma.$disconnect();
}

fixBinWarehouseIds().catch((error) => {
    console.error('Error fixing warehouse IDs:', error);
    process.exit(1);
});
