const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function main() {
    const allBins = await prisma.location.findMany({
        where: {
            OR: [
                { structuralType: 'BIN' },
                { structuralType: 'POSITION' }
            ]
        },
        select: {
            id: true,
            name: true,
            structuralType: true,
            warehouseId: true,
            parentId: true,
            x: true,
            y: true
        }
    });

    console.log(`Total Bins/Positions in DB: ${allBins.length}`);

    const onFloorPlan = allBins.filter(b => b.x !== null && b.y !== null);
    console.log(`Bins with coordinates (on Floor Plan): ${onFloorPlan.length}`);

    const hierarchyBins = allBins.filter(b => b.parentId !== null);
    console.log(`Bins with a parentId (in hierarchy): ${hierarchyBins.length}`);

    const specificWarehouseBins = allBins.filter(b => b.warehouseId !== null);
    console.log(`Bins assigned to a warehouse: ${specificWarehouseBins.length}`);

    console.log("\nDetails:");
    console.table(allBins.map(b => ({
        name: b.name,
        type: b.structuralType,
        hasParent: b.parentId !== null,
        hasCoordinates: b.x !== null && b.y !== null,
        x: b.x,
        y: b.y
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
