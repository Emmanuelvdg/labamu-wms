const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const row1 = await prisma.storageZone.findFirst({ where: { name: 'Row 1' } });
    if (!row1) { console.error('Row 1 not found!'); return; }
    console.log('Found Row 1:', row1.id);

    // Create Shelf 1 under Row 1
    const shelf1 = await prisma.storageZone.create({
        data: {
            name: 'Shelf 1',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: row1.id,
            warehouseId: row1.warehouseId,
            code: 'SHELF-1',
            fullAddress: row1.fullAddress + '.SHELF-1',
            removalStrategy: 'FIFO',
        }
    });
    console.log('Created Shelf 1:', shelf1.id);

    // Create Bin 01 under Shelf 1
    const bin01 = await prisma.storageZone.create({
        data: {
            name: 'Bin 01',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelf1.id,
            warehouseId: row1.warehouseId,
            code: 'BIN-01',
            fullAddress: shelf1.fullAddress + '.BIN-01',
            removalStrategy: 'FIFO',
            maxWeightKg: 100,
        }
    });
    console.log('Created Bin 01:', bin01.id);
    console.log('--- Hierarchy complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
