import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFunctionalAreas() {
    console.log('=== Checking WarehouseFunctionalArea Data ===\n');

    try {
        // Check if table exists and has data
        const areas = await prisma.warehouseFunctionalArea.findMany({
            include: {
                warehouse: true,
                linkedLocation: true
            }
        });

        console.log(`Found ${areas.length} functional areas\n`);

        if (areas.length === 0) {
            console.log('❌ NO functional areas found');
            console.log('   Need to create migration script to populate from existing locations\n');
        } else {
            console.log('✅ Functional areas exist:\n');
            areas.forEach(area => {
                console.log(`  - ${area.name}`);
                console.log(`    Type: ${area.areaType}`);
                console.log(`    Warehouse: ${area.warehouse.name}`);
                console.log(`    Linked Location: ${area.linkedLocation?.name || 'None'}`);
                console.log(`    Active: ${area.active}`);
                console.log('');
            });
        }

        // Check for locations that might need functional areas
        console.log('\n=== Checking Potential Receiving Locations ===\n');

        const potentialReceiving = await prisma.location.findMany({
            where: {
                type: 'INTERNAL',
                OR: [
                    { name: { contains: 'RECEIVING', mode: 'insensitive' } },
                    { name: { contains: 'STAGING', mode: 'insensitive' } }
                ]
            },
            include: {
                warehouseView: true
            }
        });

        console.log(`Found ${potentialReceiving.length} potential receiving/staging locations\n`);

        potentialReceiving.forEach(loc => {
            const hasArea = areas.some(a => a.linkedLocationId === loc.id);
            console.log(`  ${hasArea ? '✅' : '❌'} ${loc.name}`);
            console.log(`     Type: ${loc.type}`);
            console.log(`     Warehouse ID: ${loc.warehouseId || 'None'}`);
            console.log(`     Has Functional Area: ${hasArea ? 'Yes' : 'No'}`);
            console.log('');
        });

        // Summary
        console.log('\n=== Summary ===');
        console.log(`Total functional areas: ${areas.length}`);
        console.log(`Total potential receiving locations: ${potentialReceiving.length}`);
        console.log(`Locations needing functional areas: ${potentialReceiving.filter(loc => !areas.some(a => a.linkedLocationId === loc.id)).length}`);

    } catch (error: any) {
        console.error('Error checking functional areas:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkFunctionalAreas();
