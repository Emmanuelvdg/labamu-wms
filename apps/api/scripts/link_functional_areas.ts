import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function linkFunctionalAreas() {
    console.log('🔗 Linking functional areas to locations...\\n');

    try {
        // Get all warehouses
        const warehouses = await prisma.warehouse.findMany();

        for (const warehouse of warehouses) {
            console.log(`\\n📦 Processing warehouse: ${warehouse.name}`);

            // Find or create receiving location
            let receivingLocation = await prisma.location.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    type: 'INTERNAL',
                    OR: [
                        { name: { contains: 'Receiving' } },
                        { name: { contains: 'RECEIVING' } },
                        { name: { contains: 'receiving' } }
                    ]
                }
            });

            if (!receivingLocation) {
                // Create a receiving location
                receivingLocation = await prisma.location.create({
                    data: {
                        name: `${warehouse.name} - Receiving`,
                        warehouseId: warehouse.id,
                        type: 'INTERNAL',
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 80,
                    }
                });
                console.log(`  ✨ Created receiving location: ${receivingLocation.name}`);
            } else {
                console.log(`  ✅ Found receiving location: ${receivingLocation.name}`);
            }

            // Find or create staging location
            let stagingLocation = await prisma.location.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    type: 'INTERNAL',
                    OR: [
                        { name: { contains: 'Staging' } },
                        { name: { contains: 'STAGING' } },
                        { name: { contains: 'staging' } }
                    ]
                }
            });

            if (!stagingLocation) {
                // Create a staging location
                stagingLocation = await prisma.location.create({
                    data: {
                        name: `${warehouse.name} - Staging`,
                        warehouseId: warehouse.id,
                        type: 'INTERNAL',
                        x: 0,
                        y: 100,
                        width: 100,
                        height: 80,
                    }
                });
                console.log(`  ✨ Created staging location: ${stagingLocation.name}`);
            } else {
                console.log(`  ✅ Found staging location: ${stagingLocation.name}`);
            }

            // Update functional areas with linkedLocationId
            const receivingArea = await prisma.warehouseFunctionalArea.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    areaType: 'RECEIVING'
                }
            });

            if (receivingArea && !receivingArea.linkedLocationId) {
                await prisma.warehouseFunctionalArea.update({
                    where: { id: receivingArea.id },
                    data: { linkedLocationId: receivingLocation.id }
                });
                console.log(`  🔗 Linked receiving area to location`);
            }

            const stagingArea = await prisma.warehouseFunctionalArea.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    areaType: 'STAGING'
                }
            });

            if (stagingArea && !stagingArea.linkedLocationId) {
                await prisma.warehouseFunctionalArea.update({
                    where: { id: stagingArea.id },
                    data: { linkedLocationId: stagingLocation.id }
                });
                console.log(`  🔗 Linked staging area to location`);
            }
        }

        console.log('\\n✅ All functional areas are now linked to locations!\\n');
        console.log('🎉 Putaway sessions can now be started successfully!\\n');

    } catch (error) {
        console.error('❌ Error linking functional areas:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

linkFunctionalAreas()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
