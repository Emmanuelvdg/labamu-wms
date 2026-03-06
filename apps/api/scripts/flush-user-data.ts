
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('!!! DANGER: FLUSHING ALL USER DATA !!!');
    console.log('Preserving Admin Account: admin@labamu.co.id');

    // Safety check: wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Transactional Data (Delete First)
    console.log('Deleting Transactions...');
    await prisma.stockTransaction.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.pickingTask.deleteMany({});
    await prisma.pickingSession.deleteMany({});
    await prisma.putawayTask.deleteMany({});
    await prisma.putawaySession.deleteMany({});
    await prisma.receiptItem.deleteMany({});
    await prisma.receipt.deleteMany({});

    // NEW: Phase 9/13 transactional data
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.qaInspectionResult.deleteMany({});
    await prisma.qaInspection.deleteMany({});
    await prisma.documentAttachment.deleteMany({});
    await prisma.lalamoveOrder.deleteMany({});

    // 2. Orders & Lines
    console.log('Deleting Orders...');
    // Delete items first
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({}); // Includes Sales, PO, Transfer

    // 3. Inventory
    console.log('Deleting Inventory...');
    await prisma.inventoryBatch.deleteMany({});
    await prisma.productInventory.deleteMany({});

    // 4. Master Data
    console.log('Deleting Master Data...');
    // Ensure all references to product are gone
    await prisma.stockTransaction.deleteMany({}); // Re-run to be safe
    await prisma.reservation.deleteMany({});      // Re-run
    await prisma.productInventory.deleteMany({}); // Re-run
    await prisma.inventoryBatch.deleteMany({});   // Re-run
    await prisma.orderItem.deleteMany({});        // Re-run
    await prisma.pickingTask.deleteMany({});      // Re-run
    await prisma.transferOrderItem.deleteMany({}); // Link to Product
    await prisma.stockMove.deleteMany({});        // Link to Product
    await prisma.reorderingRule.deleteMany({});   // Link to Product
    await prisma.transferOrder.deleteMany({});    // Transfer Order
    await prisma.inventoryAdjustment.deleteMany({}); // Link to Product
    await prisma.scrapOrder.deleteMany({});       // Link to Product
    await prisma.productPackaging.deleteMany({}); // Link to Product (via ProductPackaging or Packaging?)


    await prisma.receiptItem.deleteMany({});      // Re-run
    await prisma.receipt.deleteMany({});          // NEW: Delete Receipts
    await prisma.purchaseOrderItem.deleteMany({});// NEW: Delete PO Items
    await prisma.purchaseOrder.deleteMany({});    // NEW: Delete POs

    await prisma.fulfillmentRule.deleteMany({});  // Delete Fulfillment Rules containing products
    await prisma.putawayRule.deleteMany({});      // Delete Putaway Rules containing products
    await prisma.rotationRule.deleteMany({});




    await prisma.productAttribute.deleteMany({});
    // await prisma.packaging.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.supplier.deleteMany({});

    // 5. Infrastructure
    console.log('Deleting Infrastructure...');
    // Need to handle Location hierarchy deletion carefully or cascade?
    // Prisma usually handles cascade if configured, but let's be safe.
    // Delete WarehouseFunctionalAreas first
    await prisma.warehouseFunctionalArea.deleteMany({});
    // Delete Locations not linked to Warehouses (if any) or just all locations?
    // Wait, Warehouse has viewLocationId.
    // Let's delete Warehouses first, which might cascade or allow deleting locations.

    // Delete Routes/Rules linked to warehouse locations?
    await prisma.rule.deleteMany({});
    await prisma.route.deleteMany({});

    // Warehouse relations
    await prisma.stocktakeTask.deleteMany({});
    await prisma.stocktakeSession.deleteMany({});
    await prisma.pickingStrategy.deleteMany({});
    await prisma.lalamoveConfig.deleteMany({});
    await prisma.pickingSession.deleteMany({});
    await prisma.putawaySession.deleteMany({});


    // We need to keep the Admin's user record, but what about their associated data? 
    // Assuming standard admin has no tied transactional data.

    // Delete Warehouses
    await prisma.warehouse.deleteMany({});

    // Delete Locations (Except maybe system roots if any? No, we want fresh setup)
    await prisma.location.deleteMany({});

    console.log('--- Flush Complete ---');
    console.log('Ready for E2E Test Run 2.0');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
