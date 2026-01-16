
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StocktakingService } from '../src/stocktaking/stocktaking.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

async function verifyStocktaking() {
    console.log('Initializing NestJS Context for Stocktaking Verification...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const stockService = app.get(StocktakingService);
    const invService = app.get(InventoryService);
    const prisma = app.get(PrismaService);

    try {
        // 1. Setup Data
        console.log('\n--- 1. Setup Data ---');
        const warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) throw new Error('No warehouse found');

        // Find a product with stock
        const productInv = await prisma.productInventory.findFirst({
            where: { quantity: { gt: 0 }, locationId: { not: null } },
            include: { product: true, location: true }
        });

        if (!productInv) {
            console.log('No product with stock found. Creating dummy...');
            // Create dummy product & stock logic here if needed, but assuming E2E warehouse has stock.
            throw new Error('No inventory found to count.');
        }

        const { product, location, quantity: systemQty } = productInv;
        console.log(`Target: Product ${product.sku} at ${location!.name} (SysQty: ${systemQty})`);

        // 2. Create Session
        console.log('\n--- 2. Create Session ---');
        const session = await stockService.createSession({
            warehouseId: warehouse.id,
            type: 'CYCLE_COUNT',
            description: 'Automated Verification'
        });
        console.log('Session Created:', session.id);

        // 3. Generate Tasks
        console.log('\n--- 3. Generate Tasks ---');
        await stockService.generateTasks(session.id);
        const sessionWithTasks = await stockService.getSession(session.id);
        const task = sessionWithTasks.tasks.find(t => t.productId === product.id && t.locationId === location!.id);

        if (!task) throw new Error('Task not generated for target product');
        console.log('Task Generated:', task.id);
        console.log('Task System Qty Snapshot:', task.systemQuantity);

        // 4. Submit Count (Create Variance: -1)
        const countQty = systemQty - 1;
        console.log(`\n--- 4. Submit Count (Counting ${countQty}, Variance -1) ---`);
        await stockService.submitCount(task.id, countQty, 'test-user');
        console.log('Count Submitted.');

        // 5. Reconcile
        console.log('\n--- 5. Reconcile ---');
        const result = await stockService.reconcileSession(session.id);
        console.log('Reconciliation Result:', result);

        // 6. Verify Adjustment
        console.log('\n--- 6. Verify Results ---');
        const adj = await prisma.inventoryAdjustment.findFirst({
            where: {
                productId: product.id,
                locationId: location!.id,
                reason: { contains: session.id }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!adj) throw new Error('Adjustment NOT found');
        console.log('Adjustment Found:', adj.quantity);
        if (adj.quantity !== -1) throw new Error(`Adjustment quantity mismatch. Expected -1, got ${adj.quantity}`);

        // 7. Verify New Stock Level
        const newStock = await prisma.productInventory.findUnique({
            where: { id: productInv.id } // Re-fetch
        });
        console.log('New System Stock:', newStock?.quantity);
        if (newStock?.quantity !== countQty) throw new Error(`Stock level mismatch. Expected ${countQty}, got ${newStock?.quantity}`);

        console.log('\n✅ VERIFICATION SUCCESSFUL');

        // Cleanup (Optional: restore stock?)
        // Let's restore to avoid messing up other tests too much.
        await invService.createAdjustment({
            locationId: location!.id,
            productId: product.id,
            currentQuantity: countQty,
            countedQuantity: systemQty,
            reason: 'Rollback Verification',
            status: 'APPLIED'
        });
        console.log('Rolled back stock.');

    } catch (e) {
        console.error('Verification Failed:', e);
        process.exit(1);
    } finally {
        await app.close();
    }
}

verifyStocktaking();
