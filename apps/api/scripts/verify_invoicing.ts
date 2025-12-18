
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PurchaseOrderService } from '../src/purchase-order/purchase-order.service';
import { InvoiceService } from '../src/invoice/invoice.service';
import { SupplierService } from '../src/supplier/supplier.service';
import { InventoryService } from '../src/inventory/inventory.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const poService = app.get(PurchaseOrderService);
    const invoiceService = app.get(InvoiceService);
    const supplierService = app.get(SupplierService);
    const inventoryService = app.get(InventoryService);

    console.log('Starting Invoicing Verification...');

    try {
        // 1. Ensure Supplier exists
        let supplier = (await supplierService.findAll())[0];
        if (!supplier) {
            console.log('Creating Supplier...');
            supplier = await supplierService.create({ name: 'Test Supplier', contactInfo: 'test@test.com' }) as any;
        }
        console.log(`Using Supplier: ${supplier.name} (${supplier.id})`);

        // 2. Ensure Product exists
        let product = (await inventoryService.getProducts())[0];
        if (!product) {
            console.log('Creating Product...');
            product = await inventoryService.createProduct({
                name: 'Test Product',
                sku: 'TEST-SKU',
                description: 'Test',
                price: 100,
                cost: 50,
                category: 'Test',
                classification: 'A',
                reorderPoint: 10,
                reorderQuantity: 50
            });
        }
        console.log(`Using Product: ${product.name} (${product.id})`);

        // 3. Create Purchase Order
        console.log('Creating Purchase Order...');
        const po: any = await poService.createPurchaseOrder({
            supplierId: supplier.id,
            items: [{ productId: product.id, quantity: 10, unitCost: 50 }],
            expectedDate: new Date(),
        });
        console.log(`Created PO: ${po.poNumber} (${po.id})`);

        // 4. Create Invoice linked to PO
        console.log('Creating Invoice...');
        const invoice: any = await invoiceService.createInvoice({
            vendorId: supplier.id,
            invoiceNumber: `INV-${Date.now()}`,
            issueDate: new Date(),
            dueDate: new Date(),
            purchaseOrderId: po.id,
            items: [{
                description: product.name,
                quantity: 10,
                unitPrice: 50,
                productId: product.id,
                poItemId: po.items[0].id
            }]
        });
        console.log(`Created Invoice: ${invoice.invoiceNumber} (${invoice.id})`);

        // 5. Verify Invoice Data
        if (invoice.purchaseOrderId !== po.id) throw new Error('Invoice not linked to PO');
        if (invoice.items.length !== 1) throw new Error('Invoice items mismatch');
        if (invoice.totalAmount !== 500) throw new Error(`Invoice total mismatch: ${invoice.totalAmount}`);

        console.log('SUCCESS: Invoicing Verification Passed!');

    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
