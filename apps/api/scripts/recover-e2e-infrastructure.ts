export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Infrastructure for E2E Test...');

    // 1. Check/create Warehouse
    let dc1 = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (!dc1) {
        console.log('⚠️ DC1 missing. Creating via script...');
        dc1 = await prisma.warehouse.create({
            data: {
                name: 'Distribution Center 1',
                shortName: 'DC1',
                address: 'Jakarta, Indonesia',
                type: 'DISTRIBUTION'
            }
        });
        console.log('✅ Created DC1:', dc1.id);
    } else {
        console.log('✅ DC1 exists:', dc1.id);
        // Fix "N/A" name if bad create occurred
        if (dc1.name === 'N/A' || !dc1.name) {
            console.log('⚠️ DC1 has bad name. Fixing...');
            await prisma.warehouse.update({ where: { id: dc1.id }, data: { name: 'Distribution Center 1' } });
        }
    }

    // 2. Check/create Receiving Dock 1
    let dock = await prisma.location.findFirst({ where: { name: 'Receiving Dock 1', warehouseId: dc1.id } });
    if (!dock) {
        console.log('⚠️ Receiving Dock 1 missing. Creating...');
        dock = await prisma.location.create({
            data: {
                name: 'Receiving Dock 1',
                warehouseId: dc1.id,
                parentId: dc1.id, // Direct child of warehouse
                type: 'INTERNAL',
                structuralType: 'LOCATION',
                code: 'DOCK-01'
            }
        });
        console.log('✅ Created Dock 1');
    }

    // 3. Hierarchy: Zone -> Row -> Shelf -> Bin
    // Zone A
    let zone = await prisma.location.findFirst({ where: { name: 'Zone A', warehouseId: dc1.id } });
    if (!zone) {
        zone = await prisma.location.create({
            data: { name: 'Zone A', warehouseId: dc1.id, parentId: dc1.id, type: 'internal', structuralType: 'ROOM', code: 'Z-A' }
        });
        console.log('✅ Created Zone A');
    }

    // Row 1
    let row = await prisma.location.findFirst({ where: { name: 'Row 1', parentId: zone.id } });
    if (!row) {
        row = await prisma.location.create({
            data: { name: 'Row 1', warehouseId: dc1.id, parentId: zone.id, type: 'internal', structuralType: 'ROW', code: 'R-1' }
        });
        console.log('✅ Created Row 1');
    }

    // Shelf 1
    let shelf = await prisma.location.findFirst({ where: { name: 'Shelf 1', parentId: row.id } });
    if (!shelf) {
        shelf = await prisma.location.create({
            data: { name: 'Shelf 1', warehouseId: dc1.id, parentId: row.id, type: 'internal', structuralType: 'SHELF', code: 'S-1' }
        });
        console.log('✅ Created Shelf 1');
    }

    // Bin 01
    let bin01 = await prisma.location.findFirst({ where: { name: 'Bin 01', parentId: shelf.id } });
    if (!bin01) {
        bin01 = await prisma.location.create({
            data: { name: 'Bin 01', warehouseId: dc1.id, parentId: shelf.id, type: 'internal', structuralType: 'POSITION', code: 'B-01' }
        });
        console.log('✅ Created Bin 01');
    }

    // Bin 02 (to verify previous fix)
    let bin02 = await prisma.location.findFirst({ where: { name: 'Bin 02', parentId: shelf.id } });
    if (!bin02) {
        bin02 = await prisma.location.create({
            data: { name: 'Bin 02', warehouseId: dc1.id, parentId: shelf.id, type: 'internal', structuralType: 'POSITION', code: 'B-02' }
        });
        console.log('✅ Created Bin 02');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
