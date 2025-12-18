import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PurchaseOrderService } from '../src/purchase-order/purchase-order.service';
import { InvoiceService } from '../src/invoice/invoice.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const poService = app.get(PurchaseOrderService);
    const invoiceService = app.get(InvoiceService);
    const inventoryService = app.get(InventoryService);
    const prisma = app.get(PrismaService);

    console.log('Starting Phase 2 Verification...');

    // 1. Setup Data (Warehouse, Product, Supplier)
    console.log('1. Setting up data...');
    const warehouse = await inventoryService.createWarehouse({
        name: 'Phase 2 Warehouse',
        shortName: 'P2WH',
        address: '123 Test St',
        companyId: '1',
        location: { lat: 0, lng: 0 },
        type: 'Physical'
    });

    // Find a valid location in this warehouse for receiving
    const location = await prisma.location.findFirst({
        where: { warehouseId: warehouse.id, type: 'INTERNAL' } // Stock location
    });
    if (!location) throw new Error('No location found in warehouse');

    const product = await inventoryService.createProduct({
        sku: `P2-PROD-${Date.now()}`,
        name: 'Phase 2 Product',
        category: 'Test',
        isStockable: true
    });

    const supplier = await prisma.supplier.create({
        data: { name: `Supplier-${Date.now()}` }
    });

    // 2. Create PO
    console.log('2. Creating Purchase Order...');
    const po = await poService.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 100, unitCost: 10 }]
    });
    console.log(`PO Created: ${po.poNumber}`);

    // 3. Partial Receive (50 items)
    console.log('3. Receiving 50 items...');
    const poItem = po.items[0];
    const receipt = await poService.receiveGoods(po.id, location.id, [
        { poItemId: poItem.id, quantity: 50 }
    ]);
    console.log(`Receipt Created: ${receipt.id}`);

    // Verify PO Status
    const updatedPo = await poService.getPurchaseOrder(po.id);
    console.log(`PO Status: ${updatedPo.status}`);
    if (updatedPo.status !== 'PARTIALLY_RECEIVED') {
        console.warn('WARNING: PO Status should be PARTIALLY_RECEIVED');
    }

    // Verify Inventory
    const inventory = await inventoryService.getInventory(product.id);
    const stock = inventory.find(i => i.warehouseId === warehouse.id);
    console.log(`Inventory Quantity: ${stock?.quantity}`);
    if (stock?.quantity !== 50) {
        throw new Error(`Expected 50 units, found ${stock?.quantity}`);
    }

    // 4. Create Invoice (for 50 items)
    console.log('4. Creating Invoice...');
    const invoice = await invoiceService.createInvoice({
        invoiceNumber: `INV-${Date.now()}`,
        vendorId: supplier.id,
        purchaseOrderId: po.id,
        issueDate: new Date(),
        dueDate: new Date(),
        items: [{
            description: 'Partial Bill',
            quantity: 50,
            unitPrice: 10,
            productId: product.id,
            poItemId: poItem.id,
            // We could link receiptItemId if we knew it, but let's test loose matching via PO Item
        }]
    });
    console.log(`Invoice Created: ${invoice.invoiceNumber}`);

    // 5. Run 3-Way Match
    console.log('5. Running 3-Way Match...');
    const matchResult = await invoiceService.matchInvoice(invoice.id);
    console.log('Match Result:', JSON.stringify(matchResult, null, 2));

    if (matchResult.overallStatus !== 'MATCHED') {
        throw new Error('3-Way Match Failed');
    }

    // 6. Create Variance Invoice (Overbill Quantity)
    console.log('6. Creating Variance Invoice (Qty 60 > Received 50)...');
    const invoice2 = await invoiceService.createInvoice({
        invoiceNumber: `INV-VAR-${Date.now()}`,
        vendorId: supplier.id,
        purchaseOrderId: po.id,
        issueDate: new Date(),
        dueDate: new Date(),
        items: [{
            description: 'Overbill',
            quantity: 60, // 60 > 50 Received
            unitPrice: 10,
            productId: product.id,
            poItemId: poItem.id,
        }]
    });

    const matchResult2 = await invoiceService.matchInvoice(invoice2.id);
    console.log('Variance Match Result:', JSON.stringify(matchResult2, null, 2));

    if (matchResult2.overallStatus !== 'VARIANCE') {
        throw new Error('Expected Variance, got MATCHED');
    }

    console.log('Phase 2 Verification Successful!');
    await app.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
