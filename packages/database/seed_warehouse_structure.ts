import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting warehouse structure seed...');

    // 1. Create Warehouse
    const warehouseName = 'Production Warehouse';
    console.log(`Creating Warehouse: ${warehouseName}`);

    const warehouse = await prisma.warehouse.create({
        data: {
            name: warehouseName,
            shortName: 'PW',
            type: 'PHYSICAL',
            location: JSON.stringify({ lat: 0, lng: 0 })
        }
    });

    // 2. Create Root View
    const root = await prisma.location.create({
        data: {
            name: `${warehouse.shortName} (VIEW)`,
            type: 'VIEW',
            structuralType: 'WAREHOUSE',
            warehouseId: warehouse.id
        }
    });

    await prisma.warehouse.update({
        where: { id: warehouse.id },
        data: { viewLocationId: root.id }
    });

    // 3. Create Hierarchy
    // Structure: 2 Rooms -> (1 Row) -> 3 Bays -> 10 Shelves -> 4 Positions

    for (let r = 1; r <= 2; r++) {
        const roomName = `Room ${r}`;
        console.log(`  Creating ${roomName}...`);

        const room = await prisma.location.create({
            data: {
                name: roomName,
                type: 'INTERNAL',
                structuralType: 'ROOM',
                parentId: root.id,
                warehouseId: warehouse.id,
                attributes: JSON.stringify({ temperature: 'Climate Controlled' })
            }
        });

        // Strict Hierarchy requires a ROW between ROOM and BAY
        const row = await prisma.location.create({
            data: {
                name: `${roomName} - Row 1`,
                type: 'INTERNAL',
                structuralType: 'ROW',
                parentId: room.id,
                warehouseId: warehouse.id
            }
        });

        for (let b = 1; b <= 3; b++) {
            const bayName = `Bay ${b}`;
            // console.log(`    Creating ${bayName}...`);

            const bay = await prisma.location.create({
                data: {
                    name: bayName,
                    type: 'INTERNAL',
                    structuralType: 'BAY',
                    parentId: row.id,
                    warehouseId: warehouse.id
                }
            });

            for (let s = 1; s <= 10; s++) {
                const shelfName = `Shelf ${s}`;

                const shelf = await prisma.location.create({
                    data: {
                        name: shelfName,
                        type: 'INTERNAL',
                        structuralType: 'SHELF',
                        parentId: bay.id,
                        warehouseId: warehouse.id,
                        attributes: JSON.stringify({ loadBearing: true })
                    }
                });

                // Batch create positions for performance if possible, but createMany is not supported for SQLite with relations easily in this loop structure without more setup
                // We'll just loop, it's only 4
                for (let p = 1; p <= 4; p++) {
                    await prisma.location.create({
                        data: {
                            name: `Pos ${p}`,
                            type: 'INTERNAL',
                            structuralType: 'POSITION',
                            parentId: shelf.id,
                            warehouseId: warehouse.id
                        }
                    });
                }
            }
        }
    }

    console.log('Seeding complete.');
    console.log('Created: 1 Warehouse, 2 Rooms, 2 Rows, 6 Bays, 60 Shelves, 240 Positions.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
