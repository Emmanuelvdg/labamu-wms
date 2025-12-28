import { PrismaClient } from '../../../packages/database/node_modules/.prisma/client';


const prisma = new PrismaClient();

async function migrateFunctionalAreas() {
    console.log('=== Migrating Receiving Locations to WarehouseFunctionalArea ===\n');

    try {
        // Find all potential receiving/staging locations
        const receivingLocations = await prisma.location.findMany({
            where: {
                type: 'INTERNAL',
                warehouseId: { not: null },
                OR: [
                    { name: { contains: 'RECEIVING' } },
                    { name: { contains: 'Receiving' } },
                    { name: { contains: 'receiving' } },
                    { name: { contains: 'STAGING' } },
                    { name: { contains: 'Staging' } },
                    { name: { contains: 'staging' } },
                    { name: { contains: 'DOCK' } },
                    { name: { contains: 'Dock' } },
                    { name: { contains: 'dock' } }
                ]
            }
        });

        console.log(`Found ${receivingLocations.length} potential receiving/staging locations\n`);

        let created = 0;
        let skipped = 0;

        for (const location of receivingLocations) {
            // Check if functional area already exists for this location
            const existing = await prisma.warehouseFunctionalArea.findFirst({
                where: { linkedLocationId: location.id }
            });

            if (existing) {
                console.log(`⏭️  Skipping "${location.name}" - already has functional area`);
                skipped++;
                continue;
            }

            // Determine area type from name
            let areaType = 'RECEIVING';
            const nameLower = location.name.toLowerCase();
            if (nameLower.includes('staging')) {
                areaType = 'STAGING';
            } else if (nameLower.includes('dock')) {
                areaType = 'RECEIVING';
            }

            // Create functional area
            await prisma.warehouseFunctionalArea.create({
                data: {
                    name: location.name,
                    areaType,
                    warehouseId: location.warehouseId!,
                    linkedLocationId: location.id,
                    active: true,
                    x: 0,
                    y: created * 100, // Stack vertically for now
                    width: 100,
                    height: 80,
                    sequence: areaType === 'RECEIVING' ? 0 : 1,
                    color: areaType === 'RECEIVING' ? '#FFA500' : '#FFFF00'
                }
            });

            console.log(`✅ Created ${areaType} area for "${location.name}"`);
            created++;
        }

        console.log(`\n=== Migration Complete ===`);
        console.log(`Created: ${created}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Total: ${receivingLocations.length}`);

    } catch (error: any) {
        console.error('❌ Migration error:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateFunctionalAreas();
