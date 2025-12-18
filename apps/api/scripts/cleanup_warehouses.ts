import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning Up Duplicate Warehouses ---');

    const warehouses = await prisma.warehouse.findMany();

    const warehouseGroups: { [name: string]: any[] } = {};
    for (const w of warehouses) {
        if (!warehouseGroups[w.name]) warehouseGroups[w.name] = [];
        warehouseGroups[w.name].push(w);
    }

    let deleted = 0;

    for (const [name, group] of Object.entries(warehouseGroups)) {
        if (group.length > 1) {
            console.log(`Processing duplicate group: "${name}" (${group.length} found)`);

            // Find the one to keep
            let keep = group[0];
            let maxLocs = -1;

            // Check location counts for each
            for (const w of group) {
                const locCount = await prisma.location.count({ where: { warehouseId: w.id } });
                console.log(` - Warehouse ${w.id}: ${locCount} locations`);
                if (locCount > maxLocs) {
                    maxLocs = locCount;
                    keep = w;
                }
            }

            console.log(`[KEEP] Keeping: "${keep.name}" (ID: ${keep.id}, Locs: ${maxLocs})`);

            for (const w of group) {
                if (w.id !== keep.id) {
                    console.log(`[DELETE] Deleting: "${w.name}" (ID: ${w.id})`);
                    try {
                        // 1. Break circular dependency
                        await prisma.warehouse.update({
                            where: { id: w.id },
                            data: { viewLocationId: null }
                        });

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
                        }
                        // Users


                        // Get all location IDs
                        const locations = await prisma.location.findMany({ where: { warehouseId: w.id }, select: { id: true } });
                        const locIds = locations.map(l => l.id);

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
                        }

                        // 3. Break location hierarchy
                        await prisma.location.updateMany({
                            where: { warehouseId: w.id },
                            data: { parentId: null }
                        });

                        // 4. Delete locations
                        await prisma.location.deleteMany({ where: { warehouseId: w.id } });

                        // 5. Delete warehouse
                        await prisma.warehouse.delete({ where: { id: w.id } });
                        deleted++;
                    } catch (e: any) {
                        console.error(`Failed to delete ${w.id}: ${e.message}`);
                    }
                }
            }
        }
    }

    console.log(`--- Cleanup Complete. Deleted ${deleted} warehouses. ---`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
