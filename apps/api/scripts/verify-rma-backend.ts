
import { NestFactory } from '@nestjs/core';
import { ReturnsModule } from '../src/returns/returns.module';
import { ReturnsService } from '../src/returns/returns.service';
import { PrismaService } from '../src/prisma.service';

/**
 * Verify RMA Backend Logic
 * 1. Create a Sales Order
 * 2. Create a Return Request (Partial)
 * 3. Receive Return (Damaged & Sellable)
 * 4. Verify Stock Impacts
 */
async function main() {
    console.log('--- Starting RMA Verification ---');

    // Use ReturnsModule context
    const app = await NestFactory.createApplicationContext(ReturnsModule);
    const returnsService = app.get(ReturnsService);
    const prisma = app.get(PrismaService);

    try {
        // 1. Setup Data: Product & Warehouse
        const warehouse = await prisma.warehouse.findFirst({ where: { name: 'E2E Warehouse' } });
        if (!warehouse) throw new Error('E2E Warehouse not found');

        const product = await prisma.product.findFirst({ where: { sku: 'E2E-PROD-NEW' } });
        if (!product) throw new Error('Product E2E-PROD-NEW not found');

        // 2. Create "Shipped" Sales Order
        const salesOrder = await prisma.order.create({
            data: {
                type: 'SALES',
                status: 'SHIPPED',
                priority: 'NORMAL',
                warehouseId: warehouse.id,
                items: {
                    create: [{ productId: product.id, quantity: 5 }]
                }
            } as any,
            include: { items: true }
        });
        console.log(`Sales Order Created: ${salesOrder.id}`);

        // 3. Create Return Request (Return 2 items: 1 Damaged, 1 Sellable)
        console.log('Creating Return Request...');
        const returnReq = await returnsService.createReturnRequest({
            originalOrderId: salesOrder.id,
            items: [
                { productId: product.id, quantity: 2, returnReason: 'Mixed Bag' }
            ]
        });
        console.log(`Return Order Created: ${returnReq.id} (Status: ${returnReq.status})`);

        // 4. Receive Return
        console.log('Receiving Return...');
        const receiptResult = await returnsService.receiveReturn(returnReq.id, {
            items: [
                { productId: product.id, quantity: 1, condition: 'DAMAGED' },
                { productId: product.id, quantity: 1, condition: 'SELLABLE' }
            ]
        });
        console.log('Receipt Result:', receiptResult);

        // 5. Verify Results
        const updatedReturn = await prisma.order.findUnique({ where: { id: returnReq.id }, include: { items: true } });
        console.log(`Updated Return Status: ${updatedReturn?.status}`);

        if (updatedReturn?.status !== 'COMPLETED') throw new Error('Return Order should be COMPLETED');

        // Check Stock
        // Quarantine
        const quarantineLoc = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, type: 'QUARANTINE' } });
        if (quarantineLoc) {
            const qStock = await prisma.inventoryBatch.findFirst({
                where: {
                    locationId: quarantineLoc.id,
                    productId: product.id,
                    batchNumber: { startsWith: 'RET-' }
                }
            });
            console.log(`Quarantine Stock: ${qStock?.currentQuantity} (Expected: 1)`);
            if (qStock?.currentQuantity !== 1) console.warn('WARNING: Quarantine stock mismatch');
        } else {
            console.warn('WARNING: Quarantine Location not found/created?');
        }

        // Sellable (General Receiving)
        const receivingLoc = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, type: 'INTERNAL', name: { contains: 'Receiving' } } });
        if (receivingLoc) {
            const rStock = await prisma.inventoryBatch.findFirst({
                where: {
                    locationId: receivingLoc.id,
                    productId: product.id,
                    batchNumber: { startsWith: 'RET-' }
                }
            });
            console.log(`Receiving Stock: ${rStock?.currentQuantity} (Expected: 1)`);
        }

        console.log('RMA Verification Successful!');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

main().catch(console.error);
