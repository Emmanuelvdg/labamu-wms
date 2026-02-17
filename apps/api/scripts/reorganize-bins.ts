import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function reorganizeBins() {
    console.log('🏗️ Reorganizing bins into proper hierarchy...\n');

    // Get all bays with their children (shelves) and grandchildren (positions)
    const bays = await prisma.location.findMany({
        where: { structuralType: 'BAY' },
        include: {
            children: {
                orderBy: { name: 'asc' }, // Ensure consistent ordering
                include: {
                    children: {
                        orderBy: { name: 'asc' }
                    }
                }
            }
        }
    });

    console.log(`Found ${bays.length} bays to process`);

    let updatedCount = 0;

    for (const bay of bays) {
        console.log(`Processing ${bay.name}...`);

        // Bay dimensions
        const bayX = bay.x || 0;
        const bayY = bay.y || 0;
        const bayWidth = bay.width || 3.5;
        const bayHeight = bay.height || 2.5;

        // Process Shelves (stacked vertically)
        const shelves = bay.children;
        const shelfHeight = bayHeight / shelves.length; // Divide bay height by number of shelves
        const shelfWidth = bayWidth; // Shelf takes full width of bay

        for (let s = 0; s < shelves.length; s++) {
            const shelf = shelves[s];

            // Stack from bottom up or top down? Let's do top down for now (y increases downwards in SVG)
            // Actually, in warehouse shelves usually start from bottom. 
            // SVG Y 0 is top. So higher Y is lower physical position.
            // Let's just stack them evenly from top to bottom for visualization
            const shelfY = bayY + (s * shelfHeight);

            await prisma.location.update({
                where: { id: shelf.id },
                data: {
                    x: bayX,
                    y: shelfY,
                    width: shelfWidth,
                    height: shelfHeight
                }
            });
            updatedCount++;

            // Process Positions (arranged horizontally within shelf)
            const positions = shelf.children;
            if (positions.length > 0) {
                const posWidth = shelfWidth / positions.length; // Divide shelf width by positions
                const posHeight = shelfHeight; // Position takes full height of shelf

                for (let p = 0; p < positions.length; p++) {
                    const position = positions[p];
                    const posX = bayX + (p * posWidth);

                    await prisma.location.update({
                        where: { id: position.id },
                        data: {
                            x: posX,
                            y: shelfY,
                            width: posWidth,
                            height: posHeight
                        }
                    });
                    updatedCount++;
                }
            }
        }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} locations (shelves & positions)`);
    await prisma.$disconnect();
}

reorganizeBins().catch((e) => {
    console.error(e);
    process.exit(1);
});
