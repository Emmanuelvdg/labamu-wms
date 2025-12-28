import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function setupReceivingAreas() {
    console.log('Setting up receiving/staging areas...\n');

    try {
        // Get all warehouses
        const warehouses = await prisma.warehouse.findMany();

        if (warehouses.length === 0) {
            console.log('⚠️  No warehouses found. Please create a warehouse first.');
            return;
        }

        for (const warehouse of warehouses) {
            console.log(`\n📦 Processing warehouse: ${warehouse.name}`);

            // Check if receiving area exists
            const existingReceiving = await prisma.warehouseFunctionalArea.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    areaType: 'RECEIVING'
                }
            });

            if (existingReceiving) {
                console.log(`  ✅ Receiving area already exists: ${existingReceiving.name}`);
            } else {
                // Create receiving area
                const receiving = await prisma.warehouseFunctionalArea.create({
                    data: {
                        name: `${warehouse.name} Receiving`,
                        warehouseId: warehouse.id,
                        areaType: 'RECEIVING',
                        active: true,
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 80,
                        sequence: 0,
                        color: '#FFA500'
                    }
                });
                console.log(`  ✨ Created receiving area: ${receiving.name}`);
            }

            // Check if staging area exists
            const existingStaging = await prisma.warehouseFunctionalArea.findFirst({
                where: {
                    warehouseId: warehouse.id,
                    areaType: 'STAGING'
                }
            });

            if (existingStaging) {
                console.log(`  ✅ Staging area already exists: ${existingStaging.name}`);
            } else {
                // Create staging area
                const staging = await prisma.warehouseFunctionalArea.create({
                    data: {
                        name: `${warehouse.name} Staging`,
                        warehouseId: warehouse.id,
                        areaType: 'STAGING',
                        active: true,
                        x: 0,
                        y: 100,
                        width: 100,
                        height: 80,
                        sequence: 1,
                        color: '#FFFF00'
                    }
                });
                console.log(`  ✨ Created staging area: ${staging.name}`);
            }
        }

        console.log('\n✅ Setup complete! Putaway sessions can now be started.\n');

    } catch (error) {
        console.error('❌ Error setting up receiving areas:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

setupReceivingAreas()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
