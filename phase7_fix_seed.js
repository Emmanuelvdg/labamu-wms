// Phase 7 Fix: Seed functional areas for DC1
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    console.log('=== Phase 7 Fix: Seed Functional Areas ===\n');

    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) { console.log('No warehouse found!'); return; }
    console.log(`Warehouse: ${warehouse.name} (${warehouse.id})`);

    // Check existing areas
    const existingAreas = await prisma.warehouseFunctionalArea.findMany({
        where: { warehouseId: warehouse.id }
    });
    console.log(`Existing functional areas: ${existingAreas.length}`);

    if (existingAreas.length === 0) {
        // Seed functional areas
        const areas = [
            { name: 'Receiving Dock', areaType: 'RECEIVING', x: 2, y: 2, width: 8, height: 5, color: '#22c55e', sequence: 1 },
            { name: 'Main Storage', areaType: 'STORAGE', x: 12, y: 2, width: 15, height: 12, color: '#3b82f6', sequence: 2 },
            { name: 'Picking Zone', areaType: 'PICKING', x: 29, y: 2, width: 8, height: 8, color: '#f59e0b', sequence: 3 },
            { name: 'Packing Area', areaType: 'PACKING', x: 29, y: 12, width: 8, height: 5, color: '#8b5cf6', sequence: 4 },
            { name: 'Shipping Dock', areaType: 'SHIPPING', x: 2, y: 14, width: 8, height: 5, color: '#ef4444', sequence: 5 },
        ];

        for (const area of areas) {
            const created = await prisma.warehouseFunctionalArea.create({
                data: {
                    warehouseId: warehouse.id,
                    ...area,
                    rotation: 0,
                }
            });
            console.log(`  Created: ${created.name} (${created.areaType}) at (${created.x}, ${created.y})`);
        }
        console.log(`\nSeeded ${areas.length} functional areas`);
    } else {
        console.log('Functional areas already exist, skipping seed');
        existingAreas.forEach(a => console.log(`  - ${a.name} (${a.areaType})`));
    }

    // Also set floor plan dimensions on warehouse if not set
    if (!warehouse.floorPlanWidth || !warehouse.floorPlanHeight) {
        await prisma.warehouse.update({
            where: { id: warehouse.id },
            data: {
                floorPlanWidth: 40,
                floorPlanHeight: 22,
                floorPlanShape: 'rectangle',
                gridEnabled: true,
                gridSize: 1,
                snapToGrid: true,
            }
        });
        console.log('\nSet floor plan dimensions: 40m x 22m');
    } else {
        console.log(`\nFloor plan dimensions already set: ${warehouse.floorPlanWidth}m x ${warehouse.floorPlanHeight}m`);
    }

    // Verify zones exist (locations with structuralType)
    const zones = await prisma.location.findMany({
        where: {
            warehouseId: warehouse.id,
            structuralType: { in: ['ROOM', 'AISLE', 'ROW'] }
        }
    });
    console.log(`\nExisting zones (ROOM/AISLE/ROW): ${zones.length}`);
    zones.forEach(z => console.log(`  - ${z.name} (${z.structuralType})`));

    // Verify bins
    const bins = await prisma.location.findMany({
        where: {
            warehouseId: warehouse.id,
            structuralType: { in: ['BIN', 'BAY', 'SHELF', 'POSITION'] }
        }
    });
    console.log(`\nExisting bins (BIN/BAY/SHELF/POSITION): ${bins.length}`);
    bins.forEach(b => console.log(`  - ${b.name} (${b.structuralType})`));

    await prisma.$disconnect();
    console.log('\n=== Phase 7 Seed Complete ===');
}

run().catch(console.error);
