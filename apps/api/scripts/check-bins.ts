import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function checkExistingBins() {
    console.log('🔍 Checking for existing bins in database...\n');

    // Check all locations
    const allLocations = await prisma.location.findMany({
        select: {
            id: true,
            name: true,
            code: true,
            type: true,
            structuralType: true,
            x: true,
            y: true,
            width: true,
            height: true,
            maxWeight: true,
            maxVolume: true,
            warehouseId: true,
            parent: {
                select: {
                    name: true,
                    structuralType: true
                }
            }
        }
    });

    console.log(`Total locations in database: ${allLocations.length}\n`);

    // Filter for bin-like locations
    const bins = allLocations.filter(loc =>
        ['BIN', 'POSITION', 'SHELF', 'BAY'].includes(loc.structuralType || '')
    );

    console.log(`Bin-like locations (BIN/POSITION/SHELF/BAY): ${bins.length}\n`);

    // Check bins with coordinates
    const binsWithCoords = bins.filter(bin =>
        bin.x !== null && bin.y !== null
    );

    console.log(`Bins with floor plan coordinates: ${binsWithCoords.length}\n`);

    // Check bins without coordinates
    const binsWithoutCoords = bins.filter(bin =>
        bin.x === null || bin.y === null
    );

    console.log(`Bins WITHOUT floor plan coordinates: ${binsWithoutCoords.length}\n`);

    // Show sample data
    if (bins.length > 0) {
        console.log('📦 Sample bins:');
        bins.slice(0, 10).forEach(bin => {
            console.log(`  - ${bin.name} (${bin.structuralType}) - Parent: ${bin.parent?.name || 'None'} - Coords: ${bin.x !== null ? `(${bin.x}, ${bin.y})` : 'NO COORDS'}`);
        });
    }

    // Group by structural type
    const byType = bins.reduce((acc, bin) => {
        const type = bin.structuralType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Bins by structural type:');
    Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });

    // Check for warehouse association
    const warehouseIds = [...new Set(bins.map(b => b.warehouseId).filter(Boolean))];
    console.log(`\n🏭 Warehouses with bins: ${warehouseIds.length}`);
    warehouseIds.forEach(id => {
        const binCount = bins.filter(b => b.warehouseId === id).length;
        console.log(`  Warehouse ${id}: ${binCount} bins`);
    });

    await prisma.$disconnect();
}

checkExistingBins().catch(console.error);
