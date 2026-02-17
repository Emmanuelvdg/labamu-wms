import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function testServiceMethod() {
    const warehouseId = 'd32c8528-98df-4341-a29c-c26db7ba7f12';

    console.log('🔍 Testing the actual service method logic...\n');

    //  Replicate the getBinUtilization service method logic
    const warehouseLocation = await prisma.location.findFirst({
        where: { warehouseView: { id: warehouseId } }
    });

    console.log('Warehouse location (from warehouseView):', warehouseLocation?.id || 'NOT FOUND');

    if (!warehouseLocation) {
        console.log('\n✓ No warehouse location, proceeding with bins query...\n');

        const bins = await prisma.location.findMany({
            where: {
                warehouseId: warehouseId,
                OR: [
                    { structuralType: 'POSITION' },
                    { structuralType: 'BIN' },
                    { structuralType: 'SHELF' }
                ]
            },
            include: {
                batches: {
                    where: { currentQuantity: { gt: 0 } },
                    include: {
                        product: {
                            select: {
                                sku: true,
                                name: true,
                                weight: true
                            }
                        }
                    }
                },
                parent: {
                    include: {
                        parent: {
                            include: {
                                parent: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${bins.length} bins`);

        if (bins.length > 0) {
            console.log('\nSample bin data:');
            const sample = bins[0];
            console.log(`  ID: ${sample.id}`);
            console.log(`  Name: ${sample.name}`);
            console.log(`  Type: ${sample.structuralType}`);
            console.log(`  Coords: (${sample.x}, ${sample.y})`);
            console.log(`  Batches: ${sample.batches?.length || 0}`);
        }

        console.log('\n✓ Service method should return bins.map(calculateBinUtilization)');
        console.log(`  Expected result: ${bins.length} bins with utilization data`);
    } else {
        console.log('\n✗ Warehouse location exists, but service returns []');
        console.log('  This is the problem');
    }

    await prisma.$disconnect();
}

testServiceMethod().catch(console.error);
