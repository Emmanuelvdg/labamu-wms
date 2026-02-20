const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function main() {
    const allLocations = await prisma.location.findMany({
        select: {
            id: true,
            name: true,
            structuralType: true,
            x: true,
            y: true
        }
    });

    const bins = allLocations.filter(loc => ['BIN', 'POSITION', 'SHELF'].includes(loc.structuralType));
    console.log(`Total bins (BIN/POSITION/SHELF): ${bins.length}`);
    const binsOnFloorPlan = bins.filter(loc => loc.x !== null && loc.y !== null);
    console.log(`Bins on floor plan: ${binsOnFloorPlan.length}`);

    if (bins.length !== 7) {
        console.log("All locations:");
        console.table(allLocations.map(b => ({
            name: b.name,
            type: b.structuralType,
            x: b.x,
            y: b.y
        })));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
