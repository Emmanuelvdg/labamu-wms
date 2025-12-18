import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debug Cleanup: Picking Test Warehouse ---');

    const warehouses = await prisma.warehouse.findMany({
        where: { name: 'Picking Test Warehouse' }
    });

    console.log(`Found ${warehouses.length} duplicates.`);
    if (warehouses.length <= 1) return;

    // Keep the first one
    const keep = warehouses[0];
    console.log(`Keeping: ${keep.id}`);

    for (const w of warehouses) {
        if (w.id !== keep.id) {
            console.log(`Deleting: ${w.id}`);
            try {
                // 1. Break circular dependency
                await prisma.warehouse.update({
                    where: { id: w.id },
                    data: { viewLocationId: null }
                });
                console.log(' - Nullified viewLocationId');

                // 2. Delete related data
                await prisma.productInventory.deleteMany({ where: { warehouseId: w.id } });
                await prisma.inventoryBatch.deleteMany({ where: { warehouseId: w.id } });
                await prisma.pickingStrategy.deleteMany({ where: { warehouseId: w.id } });

                // Orders
                const orders = await prisma.order.findMany({ where: { warehouseId: w.id }, select: { id: true } });
                const orderIds = orders.map(o => o.id);
                if (orderIds.length > 0) {
                    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
                    await prisma.reservation.deleteMany({ where: { orderId: { in: orderIds } } });
                    await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
                    await prisma.pickingTask.deleteMany({ where: { orderId: { in: orderIds } } });
                    await prisma.transferOrder.updateMany({ where: { relatedOrderId: { in: orderIds } }, data: { relatedOrderId: null } });
                    await prisma.order.deleteMany({ where: { warehouseId: w.id } });
                    console.log(` - Deleted ${orderIds.length} orders and related data`);
                }

                await prisma.pickingSession.deleteMany({ where: { warehouseId: w.id } });
                await prisma.fulfillmentRule.deleteMany({ where: { warehouseId: w.id } });

                // Transfers
                const transferOrders = await prisma.transferOrder.findMany({
                    where: { OR: [{ sourceWarehouseId: w.id }, { destinationWarehouseId: w.id }] },
                    select: { id: true }
                });
                const transferIds = transferOrders.map(t => t.id);
                if (transferIds.length > 0) {
                    await prisma.transferOrderItem.deleteMany({ where: { transferOrderId: { in: transferIds } } });
                    await prisma.transferOrder.deleteMany({ where: { id: { in: transferIds } } });
                    console.log(` - Deleted ${transferIds.length} transfers and items`);
                }
                // Users


                // Get all location IDs
                const locations = await prisma.location.findMany({ where: { warehouseId: w.id }, select: { id: true } });
                const locIds = locations.map(l => l.id);
                console.log(` - Found ${locIds.length} locations to clean up`);

                if (locIds.length > 0) {
                    // Delete location-related data
                    await prisma.inventoryAdjustment.deleteMany({ where: { locationId: { in: locIds } } });
                    await prisma.scrapOrder.deleteMany({ where: { locationId: { in: locIds } } });
                    await prisma.putawayRule.deleteMany({ where: { OR: [{ locationId: { in: locIds } }, { sourceLocationId: { in: locIds } }] } });
                    await prisma.reorderingRule.deleteMany({ where: { locationId: { in: locIds } } });
                    await prisma.rule.deleteMany({ where: { OR: [{ sourceLocationId: { in: locIds } }, { destinationLocationId: { in: locIds } }] } });
                    await prisma.package.deleteMany({ where: { locationId: { in: locIds } } });
                    await prisma.receipt.deleteMany({ where: { destinationLocationId: { in: locIds } } });
                    await prisma.stockMove.deleteMany({ where: { OR: [{ sourceLocationId: { in: locIds } }, { destinationLocationId: { in: locIds } }] } });
                    await prisma.pickingTask.deleteMany({ where: { sourceLocationId: { in: locIds } } });
                    console.log(' - Deleted location-related data');
                }

                // 3. Break location hierarchy
                await prisma.location.updateMany({
                    where: { warehouseId: w.id },
                    data: { parentId: null }
                });
                console.log(' - Nullified location parentIds');

                // 4. Delete locations
                const deletedLocs = await prisma.location.deleteMany({ where: { warehouseId: w.id } });
                console.log(` - Deleted ${deletedLocs.count} locations`);

                // 5. Delete warehouse
                await prisma.warehouse.delete({ where: { id: w.id } });
                console.log(' - Deleted warehouse');
            } catch (e: any) {
                console.error(`ERROR deleting ${w.id}: ${e.message}`);
                process.exit(1);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
