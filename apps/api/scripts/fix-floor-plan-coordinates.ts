
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing Floor Plan Coordinates for Distribution Center 1 (Meters)...');

    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' },
    });

    if (!warehouse) {
        console.error('Warehouse "Distribution Center 1" not found');
        return;
    }

    // Fetch roots (Zones/Rooms)
    const roots = await prisma.location.findMany({
        where: {
            warehouseId: warehouse.id,
            parentId: null
        },
        include: {
            children: { // Rows
                include: {
                    children: { // Racks/Bays
                        include: {
                            children: true // Shelves/Bins
                        }
                    }
                }
            }
        }
    });

    console.log(`Found ${roots.length} root locations.`);

    // Warehouse is 50x30 (default).
    // Let's place roots (Zones) in a grid.
    // Zone size strategy: 14m x 20m.
    // Grid: 3 columns max.

    let rootX = 2; // Start with 2m margin
    let rootY = 2;
    const zoneWidth = 14;
    const zoneHeight = 20; // Large vertical zones
    const zoneSpacingX = 16; // 14 + 2m gap

    for (const root of roots) {
        console.log(`Processing Root: ${root.name} (${root.id})`);

        // Update Root (Zone/Room)
        await prisma.location.update({
            where: { id: root.id },
            data: {
                x: rootX,
                y: rootY,
                width: zoneWidth,
                height: zoneHeight,
                rotation: 0
            }
        });

        let rowX = rootX + 1; // 1m padding inside zone
        let rowY = rootY + 2; // 2m padding top

        for (const row of root.children) {
            console.log(`  Processing Child (Row): ${row.name}`);
            // Row size: 12m width, 2m height
            const rowWidth = 12;
            const rowHeight = 2.5;

            await prisma.location.update({
                where: { id: row.id },
                data: {
                    x: rowX,
                    y: rowY,
                    width: rowWidth,
                    height: rowHeight,
                    rotation: 0
                }
            });

            let bayX = rowX + 0.5; // Padding inside row
            let bayY = rowY + 0.5;

            for (const bay of row.children) {
                // Bay/Rack size: 1m x 1.5m
                await prisma.location.update({
                    where: { id: bay.id },
                    data: {
                        x: bayX,
                        y: bayY,
                        width: 1.0,
                        height: 1.5,
                        rotation: 0
                    }
                });

                bayX += 1.5; // Spacing 1.5m

                // If bay exceeds row width, stop or wrap (but simpler to just clip for now)
                if (bayX > rowX + rowWidth) break;
            }

            rowY += 4; // Gap between rows (2.5 height + 1.5 gap)

            // If row exceeds zone height, stop
            if (rowY > rootY + zoneHeight) break;
        }

        rootX += zoneSpacingX;

        // Wrap to next line if exceeds warehouse width (50m)
        if (rootX + zoneWidth > 48) {
            rootX = 2;
            rootY += zoneHeight + 2;
        }
    }

    console.log('✅ Floor Plan Coordinates Updated (Meters).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
