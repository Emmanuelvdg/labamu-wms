import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data cleanup...');

    // Delete in reverse order of dependencies
    await prisma.stockTransaction.deleteMany();
    console.log('Deleted StockTransactions');

    await prisma.reservation.deleteMany();
    console.log('Deleted Reservations');

    await prisma.orderItem.deleteMany();
    console.log('Deleted OrderItems');

    await prisma.order.deleteMany();
    console.log('Deleted Orders');

    await prisma.inventoryAdjustment.deleteMany();
    console.log('Deleted InventoryAdjustments');

    await prisma.scrapOrder.deleteMany();
    console.log('Deleted ScrapOrders');

    await prisma.inventoryBatch.deleteMany();
    console.log('Deleted InventoryBatches');

    await prisma.productInventory.deleteMany();
    console.log('Deleted ProductInventories');

    await prisma.putawayRule.deleteMany();
    console.log('Deleted PutawayRules');

    await prisma.reorderingRule.deleteMany();
    console.log('Deleted ReorderingRules');

    await prisma.rule.deleteMany();
    console.log('Deleted Rules');

    await prisma.route.deleteMany();
    console.log('Deleted Routes');

    await prisma.package.deleteMany();
    console.log('Deleted Packages');

    // Locations might have self-references (parent/child), so we might need multiple passes or cascade if configured, 
    // but Prisma doesn't support cascade delete on self-relations easily without raw SQL or careful ordering.
    // For now, let's try deleteMany. If it fails due to FK, we might need to nullify parents first.
    try {
        await prisma.location.deleteMany();
        console.log('Deleted Locations');
    } catch (e) {
        console.log('Failed to delete locations directly, attempting to break hierarchy...');
        await prisma.location.updateMany({ data: { parentId: null } });
        await prisma.location.deleteMany();
        console.log('Deleted Locations after breaking hierarchy');
    }

    await prisma.warehouse.deleteMany();
    console.log('Deleted Warehouses');

    await prisma.product.deleteMany();
    console.log('Deleted Products');

    console.log('Data cleanup completed.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
