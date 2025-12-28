import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function setupMainFactory() {
    try {
        console.log('🔧 Setting up functional areas for Main Factory...\n');

        // Find Main Factory warehouse
        const warehouse = await prisma.warehouse.findFirst({
            where: { name: 'Main Factory' }
        });

        if (!warehouse) {
            console.log('❌ Main Factory warehouse not found!');
            console.log('   Please create the warehouse first.');
            return;
        }

        console.log(`📦 Found warehouse: ${warehouse.name} (ID: ${warehouse.id})\n`);

        // Check if receiving area exists
        const existingReceiving = await prisma.warehouseFunctionalArea.findFirst({
            where: {
                warehouseId: warehouse.id,
                areaType: 'RECEIVING'
            }
        });

        if (!existingReceiving) {
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
        } else {
            console.log(`  ✅ Receiving area already exists: ${existingReceiving.name}`);
        }

        // Check if staging area exists
        const existingStaging = await prisma.warehouseFunctionalArea.findFirst({
            where: {
                warehouseId: warehouse.id,
                areaType: 'STAGING'
            }
        });

        if (!existingStaging) {
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
        } else {
            console.log(`  ✅ Staging area already exists: ${existingStaging.name}`);
        }

        console.log('\n✅ Main Factory setup complete! You can now start putaway sessions.\n');

    } catch (error) {
        console.error('❌ Error setting up Main Factory:', error);
    } finally {
        await prisma.$disconnect();
    }
}

setupMainFactory();
