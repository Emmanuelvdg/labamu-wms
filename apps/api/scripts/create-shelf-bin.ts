import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const row1 = await prisma.location.findFirst({ where: { name: 'Row 1' } });
    if (!row1) { console.error('Row 1 not found!'); return; }
    console.log('Found Row 1:', row1.id, '- fullAddress:', row1.fullAddress);

    // Check if Shelf 1 already exists
    const existingShelf = await prisma.location.findFirst({ where: { name: 'Shelf 1' } });
    if (existingShelf) {
        console.log('Shelf 1 already exists:', existingShelf.id);
    }

    // Create Shelf 1 under Row 1
    const shelf1 = existingShelf || await prisma.location.create({
        data: {
            name: 'Shelf 1',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: row1.id,
            warehouseId: row1.warehouseId,
            code: 'SHELF-1',
            fullAddress: (row1.fullAddress || 'ROW-1') + '.SHELF-1',
            removalStrategy: 'FIFO',
        }
    });
    console.log('Shelf 1:', shelf1.id);

    // Check if Bin 01 already exists
    const existingBin = await prisma.location.findFirst({ where: { name: 'Bin 01' } });
    if (existingBin) {
        console.log('Bin 01 already exists:', existingBin.id);
        return;
    }

    // Create Bin 01 under Shelf 1
    const bin01 = await prisma.location.create({
        data: {
            name: 'Bin 01',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelf1.id,
            warehouseId: row1.warehouseId,
            code: 'BIN-01',
            fullAddress: (shelf1.fullAddress || 'SHELF-1') + '.BIN-01',
            removalStrategy: 'FIFO',
            maxWeightKg: 100,
        }
    });
    console.log('Created Bin 01:', bin01.id);
    console.log('--- Hierarchy complete ---');
    console.log('DC1 > Zone A > Row 1 > Shelf 1 > Bin 01');
}

main().catch(console.error).finally(() => prisma.$disconnect());
