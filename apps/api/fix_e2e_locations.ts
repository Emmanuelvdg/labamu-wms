import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixE2ELocations() {
    const warehouseId = 'd4ddc184-0fe1-44f6-b6dc-d43fa8cca6d2';
    const receivingLocationId = 'b7f0355a-b480-46d7-878c-03551cf38842';

    console.log('=== Fixing E2E Putaway Locations ===\n');

    // 1. Fix the receiving location's warehouseId
    console.log('1. Fixing receiving location warehouse association...');
    const receivingLocation = await prisma.location.update({
        where: { id: receivingLocationId },
        data: { warehouseId }
    });
    console.log(`✅ Updated: ${receivingLocation.name}`);
    console.log(`   - warehouseId: ${receivingLocation.warehouseId}`);
    console.log(`   - type: ${receivingLocation.type}\n`);

    // 2. Check if storage location exists
    console.log('2. Checking for storage location...');
    let storageLocation = await prisma.location.findFirst({
        where: {
            name: 'E2E Putaway Storage A-1'
        }
    });

    if (!storageLocation) {
        // Get the warehouse root location to use as parent
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId },
            include: { rootLocation: true }
        });

        console.log('   Storage location not found. Creating it...');
        storageLocation = await prisma.location.create({
            data: {
                name: 'E2E Putaway Storage A-1',
                code: 'E2E-STORAGE-A1',
                type: 'INTERNAL',
                warehouseId,
                parentId: warehouse.rootLocation.id,
                zonePriority: 10, // Good zone for storage
                putawaySequence: 1
            }
        });
        console.log(`✅ Created: ${storageLocation.name}`);
    } else {
        console.log(`✅ Found: ${storageLocation.name}`);
        // Make sure it has the correct warehouseId
        if (!storageLocation.warehouseId) {
            storageLocation = await prisma.location.update({
                where: { id: storageLocation.id },
                data: { warehouseId }
            });
            console.log(`   - Fixed warehouseId`);
        }
    }
    console.log(`   - ID: ${storageLocation.id}`);
    console.log(`   - type: ${storageLocation.type}`);
    console.log(`   - warehouseId: ${storageLocation.warehouseId}\n`);

    // 3. Verify the fixing worked
    console.log('3. Verifying fix...');
    const receivingLocations = await prisma.location.findMany({
        where: {
            warehouseId,
            OR: [
                { type: 'VENDOR' },
                { name: { contains: 'RECEIVING' } },
                { name: { contains: 'STAGING' } }
            ]
        }
    });

    console.log(`   Found ${receivingLocations.length} receiving location(s):`);
    receivingLocations.forEach(loc => {
        console.log(`   ✅ ${loc.name} (type: ${loc.type})`);
    });

    if (receivingLocations.length === 0) {
        console.log('   ❌ Still no receiving locations! Something went wrong.');
    } else {
        console.log('\n✅ Fix complete! Putaway should now work.');
    }

    await prisma.$disconnect();
}

fixE2ELocations().catch(console.error);
