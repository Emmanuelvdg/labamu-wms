
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Setting up E2E Infrastructure (Backfill) ---');

    const wh = await prisma.warehouse.findFirst({ where: { name: 'Distribution Center 1' } });
    if (!wh) {
        console.error('Warehouse DC1 not found.');
        return;
    }

    // We already have 'Receiving Dock' auto-created, we can rename it or use it. 
    // Let's rename 'Receiving Dock' to 'Receiving Dock 1' to match plan if we care, 
    // or just ensure Zone A exists.

    // 1. Create Zone A
    let zoneA = await prisma.location.findFirst({
        where: { warehouseId: wh.id, name: 'Zone A' }
    });

    if (!zoneA) {
        console.log('Creating Zone A...');
        // Find parent view
        const view = await prisma.location.findUnique({ where: { id: wh.viewLocationId! } });
        zoneA = await prisma.location.create({
            data: {
                name: 'Zone A',
                warehouseId: wh.id,
                parentId: view?.id,
                type: 'INTERNAL',
                structuralType: 'ROOM',
                code: 'ZONE-A'
            }
        });
    }

    // 2. Create Row 1
    let row1 = await prisma.location.findFirst({
        where: { parentId: zoneA.id, name: 'Row 1' }
    });

    if (!row1) {
        console.log('Creating Row 1...');
        row1 = await prisma.location.create({
            data: {
                name: 'Row 1',
                warehouseId: wh.id,
                parentId: zoneA.id,
                type: 'INTERNAL',
                structuralType: 'ROW',
                code: 'R01'
            }
        });
    }

    // 3. Create Shelf 1
    let shelf1 = await prisma.location.findFirst({
        where: { parentId: row1.id, name: 'Shelf 1' }
    });

    if (!shelf1) {
        console.log('Creating Shelf 1...');
        shelf1 = await prisma.location.create({
            data: {
                name: 'Shelf 1',
                warehouseId: wh.id,
                parentId: row1.id,
                type: 'INTERNAL',
                structuralType: 'SHELF',
                code: 'S01'
            }
        });
    }

    // 4. Create Bin 01
    let bin01 = await prisma.location.findFirst({
        where: { parentId: shelf1.id, name: 'Bin 01' }
    });

    if (!bin01) {
        console.log('Creating Bin 01...');
        bin01 = await prisma.location.create({
            data: {
                name: 'Bin 01',
                warehouseId: wh.id,
                parentId: shelf1.id,
                type: 'INTERNAL',
                structuralType: 'POSITION',
                code: 'B01'
            }
        });
    }

    console.log('--- Infrastructure Setup Complete ---');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
