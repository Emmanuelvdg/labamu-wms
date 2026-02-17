import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function testBinQuery() {
    const warehouseId = 'd32c8528-98df-4341-a29c-c26db7ba7f12';

    console.log('🔍 Testing bin query directly against database...\n');
    console.log(`Warehouse ID: ${warehouseId}\n`);

    // Test the exact query from the service
    console.log('Query 1: Bins with structural type filter AND warehouse ID');
    const bins = await prisma.location.findMany({
        where: {
            warehouseId: warehouseId,
            OR: [
                { structuralType: 'POSITION' },
                { structuralType: 'BIN' },
                { structuralType: 'SHELF' }
            ]
        },
        select: {
            id: true,
            name: true,
            structuralType: true,
            x: true,
            y: true,
            warehouseId: true
        },
        take: 5
    });

    console.log(`  Found: ${bins.length} bins`);
    if (bins.length > 0) {
        console.log(`  Sample bin:`, bins[0]);
    }

    // Test without warehouse filter
    console.log('\nQuery 2: All bins (no warehouse filter)');
    const allBinsCount = await prisma.location.count({
        where: {
            OR: [
                { structuralType: 'POSITION' },
                { structuralType: 'BIN' },
                { structuralType: 'SHELF' }
            ]
        }
    });

    console.log(`  Found: ${allBinsCount} bins total`);

    // Test warehouse filter separately
    console.log('\nQuery 3: Locations with this warehouse ID (any type)');
    const warehouseLocsCount = await prisma.location.count({
        where: {
            warehouseId: warehouseId
        }
    });

    console.log(`  Found: ${warehouseLocsCount} locations for this warehouse`);

    // Test with warehouse filter
    console.log('\nQuery 4: Bins with warehouse ID (each type separately)');

    const positions = await prisma.location.count({
        where: {
            warehouseId: warehouseId,
            structuralType: 'POSITION'
        }
    });

    const shelves = await prisma.location.count({
        where: {
            warehouseId: warehouseId,
            structuralType: 'SHELF'
        }
    });

    const bins_type = await prisma.location.count({
        where: {
            warehouseId: warehouseId,
            structuralType: 'BIN'
        }
    });

    const bays = await prisma.location.count({
        where: {
            warehouseId: warehouseId,
            structuralType: 'BAY'
        }
    });

    console.log(`  POSITION: ${positions}`);
    console.log(`  SHELF: ${shelves}`);
    console.log(`  BIN: ${bins_type}`);
    console.log(`  BAY: ${bays}`);

    // Check a sample bin
    console.log('\nQuery 5: Sample bin with full details');
    const sampleBin = await prisma.location.findFirst({
        where: {
            OR: [
                { structuralType: 'POSITION' },
                { structuralType: 'BIN' },
                { structuralType: 'SHELF' }
            ]
        }
    });

    if (sampleBin) {
        console.log(`  Name: ${sampleBin.name}`);
        console.log(`  Type: ${sampleBin.structuralType}`);
        console.log(`  Warehouse ID: ${sampleBin.warehouseId}`);
        console.log(`  Coordinates: (${sampleBin.x}, ${sampleBin.y})`);
    }

    await prisma.$disconnect();
}

testBinQuery().catch(console.error);
