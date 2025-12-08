import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting location reset...');

    // 1. Clean up dependencies (optional, but good for clean slate)
    // We'll try to delete locations. If it fails, we might need to delete related records.
    // For this script, we'll assume we can force delete or just delete what we can.

    try {
        console.log('Deleting existing inventory and rules...');
        // Delete in order of dependency
        await prisma.stockTransaction.deleteMany({});
        await prisma.stockMove.deleteMany({});
        await prisma.inventoryAdjustment.deleteMany({});
        await prisma.scrapOrder.deleteMany({});
        await prisma.inventoryBatch.deleteMany({});
        await prisma.productInventory.deleteMany({});
        await prisma.putawayRule.deleteMany({});
        await prisma.reorderingRule.deleteMany({});
        await prisma.rule.deleteMany({}); // Route rules
        await prisma.package.deleteMany({});
        await prisma.receipt.deleteMany({});
        await prisma.purchaseOrderItem.deleteMany({}); // Might reference product, but let's be safe
        await prisma.purchaseOrder.deleteMany({});

        console.log('Deleting existing locations...');
        // We need to break the circular dependency between Warehouse and Location (viewLocationId)
        // First, set viewLocationId to null for all warehouses
        await prisma.warehouse.updateMany({
            data: { viewLocationId: null }
        });

        // Now delete locations
        await prisma.location.deleteMany({});

        // Delete warehouses
        await prisma.warehouse.deleteMany({});

        console.log('Creating new Warehouse...');
        const warehouse = await prisma.warehouse.create({
            data: {
                name: 'Test Warehouse',
                shortName: 'TW',
                type: 'PHYSICAL',
                location: JSON.stringify({ lat: 0, lng: 0 })
            }
        });

        console.log('Creating Root Location (View)...');
        const root = await prisma.location.create({
            data: {
                name: 'TW (VIEW)',
                type: 'VIEW',
                structuralType: 'WAREHOUSE',
                warehouseId: warehouse.id
            }
        });

        // Link warehouse to view
        await prisma.warehouse.update({
            where: { id: warehouse.id },
            data: { viewLocationId: root.id }
        });

        console.log('Creating Hierarchy...');

        // Room
        const room = await prisma.location.create({
            data: {
                name: 'Room A',
                type: 'INTERNAL',
                structuralType: 'ROOM',
                parentId: root.id,
                warehouseId: warehouse.id,
                attributes: JSON.stringify({ temperature: 'Climate Controlled' })
            }
        });

        // Row
        const row = await prisma.location.create({
            data: {
                name: 'Row 1',
                type: 'INTERNAL',
                structuralType: 'ROW',
                parentId: room.id,
                warehouseId: warehouse.id
            }
        });

        // Bay
        const bay = await prisma.location.create({
            data: {
                name: 'Bay 1',
                type: 'INTERNAL',
                structuralType: 'BAY',
                parentId: row.id,
                warehouseId: warehouse.id
            }
        });

        // Shelf
        const shelf = await prisma.location.create({
            data: {
                name: 'Shelf 1',
                type: 'INTERNAL',
                structuralType: 'SHELF',
                parentId: bay.id,
                warehouseId: warehouse.id,
                attributes: JSON.stringify({ loadBearing: true })
            }
        });

        // Position
        const position = await prisma.location.create({
            data: {
                name: 'Pos 1',
                type: 'INTERNAL',
                structuralType: 'POSITION',
                parentId: shelf.id,
                warehouseId: warehouse.id
            }
        });

        console.log('Reset complete. Hierarchy created:');
        console.log(`Warehouse -> ${room.name} -> ${row.name} -> ${bay.name} -> ${shelf.name} -> ${position.name}`);

    } catch (error) {
        console.error('Error during reset:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
