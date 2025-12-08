
import { PrismaClient } from '@prisma/client';
import { InventoryService } from '../src/inventory/inventory.service';
import { PurchaseOrderService } from '../src/purchase-order/purchase-order.service';
import { RuleService } from '../src/rule/rule.service';

const prisma = new PrismaClient();
// Mock dependencies for services if needed, or instantiate them
// We need real services to test logic
const inventoryService = new InventoryService(prisma);
const ruleService = new RuleService(prisma, inventoryService);
const poService = new PurchaseOrderService(prisma, inventoryService, ruleService);

async function run() {
    console.log('Starting Packaging Flow Verification...');

    // 1. Setup Data
    const warehouse = await prisma.warehouse.create({
        data: { name: 'Pkg Test Warehouse', location: 'Test Location' }
    });
    const location = await prisma.location.create({
        data: { name: 'Pkg Test Location', warehouseId: warehouse.id, type: 'BAY' }
    });
    const supplier = await prisma.supplier.create({
        data: { name: 'Pkg Test Supplier', email: 'test@pkg.com' }
    });
    const product = await prisma.product.create({
        data: {
            name: 'Pkg Test Product',
            sku: `PKG-${Date.now()}`,
            description: 'Test Product',
            price: 100
        }
    });

    // 2. Define Packaging
    console.log('Creating Packaging Unit...');
    const packaging = await inventoryService.createProductPackaging({
        productId: product.id,
        name: 'Test Box',
        type: 'BOX',
        quantity: 10
    });
    console.log('Packaging created:', packaging.id);

    // 3. Create PO
    console.log('Creating Purchase Order...');
    const po = await poService.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{
            productId: product.id,
            quantity: 2, // 2 Boxes
            unitCost: 10,
            packagingId: packaging.id
        }],
        destinationLocationId: location.id
    });
    console.log('PO Created:', po.id);

    // 4. Receive PO
    console.log('Receiving PO...');
    await poService.receiveGoods(po.id, location.id);
    console.log('PO Received');

    // 5. Verify
    console.log('Verifying Results...');

    // Check Packages
    const packages = await prisma.package.findMany({
        where: { locationId: location.id, packagingId: packaging.id }
    });
    console.log(`Found ${packages.length} packages (Expected 2)`);
    if (packages.length !== 2) throw new Error(`Expected 2 packages, found ${packages.length}`);

    // Check Inventory
    const inventory = await prisma.productInventory.findFirst({
        where: { productId: product.id, locationId: location.id }
    });
    console.log(`Inventory Quantity: ${inventory?.quantity} (Expected 20)`);
    if (inventory?.quantity !== 20) throw new Error(`Expected 20 units in inventory, found ${inventory?.quantity}`);

    // Check Batches
    const batches = await prisma.inventoryBatch.findMany({
        where: { productId: product.id, locationId: location.id }
    });
    console.log(`Found ${batches.length} batches (Expected 2)`);
    // Verify each batch is linked to a package
    for (const batch of batches) {
        if (!batch.packageId) throw new Error(`Batch ${batch.id} is not linked to a package`);
        if (batch.currentQuantity !== 10) throw new Error(`Batch ${batch.id} quantity is ${batch.currentQuantity}, expected 10`);
    }

    console.log('SUCCESS: Packaging Flow Verified!');

    // Cleanup
    // await prisma.productInventory.deleteMany({ where: { productId: product.id } });
    // await prisma.inventoryBatch.deleteMany({ where: { productId: product.id } });
    // await prisma.package.deleteMany({ where: { packagingId: packaging.id } });
    // await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });
    // await prisma.purchaseOrder.deleteMany({ where: { id: po.id } });
    // await prisma.productPackaging.deleteMany({ where: { id: packaging.id } });
    // await prisma.product.delete({ where: { id: product.id } });
    // await prisma.location.delete({ where: { id: location.id } });
    // await prisma.warehouse.delete({ where: { id: warehouse.id } });
    // await prisma.supplier.delete({ where: { id: supplier.id } });
}

run()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
