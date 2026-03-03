const { PrismaClient } = require('@labamu/database');
const p = new PrismaClient();
async function main() {
    // First get the warehouseId from the location
    const loc = await p.location.findUnique({
        where: { id: '6a061fac-5cf3-4514-abe3-2fbb6e939b6d' }
    });
    console.log('Location:', loc.name, 'warehouseId:', loc.warehouseId);

    // Find the warehouse if warehouseId is on a parent
    let warehouseId = loc.warehouseId;
    if (!warehouseId && loc.parentId) {
        // Traverse up to find warehouse
        let parent = await p.location.findUnique({ where: { id: loc.parentId } });
        while (parent) {
            if (parent.warehouseId) {
                // Check if there's a warehouse with this viewLocationId
                const wh = await p.warehouse.findFirst({ where: { viewLocationId: parent.id } });
                if (wh) { warehouseId = wh.id; break; }
            }
            if (!parent.parentId) break;
            parent = await p.location.findUnique({ where: { id: parent.parentId } });
        }
    }

    // If still no warehouseId, find any warehouse
    if (!warehouseId) {
        const wh = await p.warehouse.findFirst();
        warehouseId = wh?.id;
    }
    console.log('Using warehouseId:', warehouseId);

    // Create a batch record to match the aggregate inventory
    const batch = await p.inventoryBatch.create({
        data: {
            batchNumber: `INIT-BIN01-${Date.now()}`,
            productId: '916d2d47-eab4-46f6-a5f5-e2ab6ceb7c0b',
            warehouseId: warehouseId,
            locationId: '6a061fac-5cf3-4514-abe3-2fbb6e939b6d',
            initialQuantity: 5002,
            currentQuantity: 5002,
            costPerUnit: 0,
            purchaseDate: new Date(),
            status: 'Active',
        }
    });
    console.log('Created batch:', batch.id, 'qty:', batch.currentQuantity);
}
main().catch(console.error).finally(() => p.$disconnect());
