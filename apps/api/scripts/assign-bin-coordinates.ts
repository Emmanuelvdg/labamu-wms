import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function assignBinCoordinates() {
    console.log('📍 Assigning floor plan coordinates to bins...\n');

    const warehouseId = 'd32c8528-98df-4341-a29c-c26db7ba7f12';

    // Get warehouse dimensions from functional areas or default
    const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { floorPlanWidth: true, floorPlanHeight: true }
    });

    const warehouseWidth = warehouse?.floorPlanWidth || 50;
    const warehouseHeight = warehouse?.floorPlanHeight || 30;

    console.log(`Warehouse dimensions: ${warehouseWidth}m × ${warehouseHeight}m\n`);

    // Get all bins for this warehouse, ordered by hierarchy
    const bays = await prisma.location.findMany({
        where: {
            warehouseId,
            structuralType: 'BAY'
        },
        include: {
            children: {
                include: {
                    children: {
                        include: {
                            children: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    console.log(`Found ${bays.length} bays to position\n`);

    // Storage zone dimensions (where bins will be placed)
    // Leave space for receiving (left) and shipping (right)
    const storageStartX = 12; // After receiving area
    const storageEndX = 38; // Before shipping area
    const storageStartY = 5;
    const storageEndY = 25;

    const storageWidth = storageEndX - storageStartX;
    const storageHeight = storageEndY - storageStartY;

    // Calculate bay layout
    const baysPerRow = Math.ceil(Math.sqrt(bays.length));
    const bayWidth = 3.5; // meters
    const bayHeight = 2.5; // meters
    const baySpacing = 1.5; // aisle width

    console.log(`Layout: ${baysPerRow} bays per row\n`);

    let updatedCount = 0;

    for (let i = 0; i < bays.length; i++) {
        const bay = bays[i];
        const row = Math.floor(i / baysPerRow);
        const col = i % baysPerRow;

        // Calculate bay position
        const bayX = storageStartX + col * (bayWidth + baySpacing);
        const bayY = storageStartY + row * (bayHeight + baySpacing);

        // Update bay coordinates
        await prisma.location.update({
            where: { id: bay.id },
            data: {
                x: bayX,
                y: bayY,
                width: bayWidth,
                height: bayHeight
            }
        });

        console.log(`✓ Bay ${i + 1}: ${bay.name} at (${bayX.toFixed(1)}, ${bayY.toFixed(1)})`);
        updatedCount++;

        // Get shelves for this bay
        const shelves = bay.children || [];
        const shelfHeight = bayHeight / shelves.length;
        const shelfWidth = bayWidth;

        for (let j = 0; j < shelves.length; j++) {
            const shelf = shelves[j];
            const shelfY = bayY + j * shelfHeight;

            // Update shelf coordinates (relative to bay)
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

            // Get positions for this shelf
            const positions = shelf.children || [];
            const posWidth = shelfWidth / positions.length;

            for (let k = 0; k < positions.length; k++) {
                const position = positions[k];
                const posX = bayX + k * posWidth;

                // Update position coordinates
                await prisma.location.update({
                    where: { id: position.id },
                    data: {
                        x: posX,
                        y: shelfY,
                        width: posWidth,
                        height: shelfHeight
                    }
                });

                updatedCount++;
            }
        }
    }

    console.log(`\n✅ Updated ${updatedCount} locations with floor plan coordinates`);
    console.log(`\n📦 Summary:`);
    console.log(`  - ${bays.length} bays positioned`);
    console.log(`  - Bays arranged in ${baysPerRow} columns`);
    console.log(`  - Storage area: ${storageStartX}m to ${storageEndX}m (X), ${storageStartY}m to ${storageEndY}m (Y)`);

    await prisma.$disconnect();
}

assignBinCoordinates().catch((error) => {
    console.error('Error assigning coordinates:', error);
    process.exit(1);
});
