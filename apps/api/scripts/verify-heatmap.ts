
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { UtilisationService } from '../src/inventory/utilisation.service';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const service = app.get(UtilisationService);
    const prisma = app.get(PrismaService);

    console.log('--- Verifying Heatmap Batch Logic ---');

    // 0. Ensure Warehouse Exists
    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: { name: 'Heatmap Test WH', code: 'HM-WH' } // Assuming minimal fields
        } as any);
    }
    console.log(`Using Warehouse: ${warehouse.id}`);

    // 1. Create Test Location (Small Bin)
    const bin = await prisma.location.create({
        data: {
            name: 'Heatmap Test Bin',
            code: 'HEAT-001-' + Date.now(),
            warehouseId: warehouse.id, // Correct relation
            structuralType: 'BIN',
            type: 'INTERNAL',
            innerWidth: 1000,
            innerLength: 1000,
            innerHeight: 1000, // 1m3
            maxWeightKg: 100
        } as any
    });

    console.log(`Created Bin: ${bin.id}`);

    // 2. Create Test Product & Inventory
    const product = await prisma.product.create({
        data: {
            name: 'Heavy Box',
            sku: 'HEAVY-' + Date.now(),
            weight: 50, // 50kg
            width: 100, height: 100, depth: 100, // Small volume
            category: 'TEST',
            description: 'Test',
            status: 'ACTIVE'
        } as any
    });

    // Add 1 item (50% weight utilization)
    // Note: UtilisationService uses 'inventory' relation which maps to ProductInventory
    await prisma.productInventory.create({
        data: {
            productId: product.id,
            locationId: bin.id,
            warehouseId: warehouse.id, // Correct ID
            quantity: 1,
            // receivedAt: new Date() // Not in ProductInventory
        } as any
    });

    // 3. Call Batch Util
    const report = await service.getBatchUtilisation([bin.id]);
    console.log('Batch Report:', JSON.stringify(report, null, 2));

    const binReport = report[bin.id];
    if (!binReport) throw new Error('Report missing for bin');

    // 4. Assertions
    if (binReport.status !== 'PARTIAL') console.error('FAIL: Status should be PARTIAL');
    else console.log('PASS: Status is PARTIAL');

    if (binReport.weightUtilisation !== 50) console.error(`FAIL: Weight util should be 50%, got ${binReport.weightUtilisation}`);
    else console.log('PASS: Weight Utilisation is 50%');

    // 5. Cleanup
    await prisma.productInventory.deleteMany({ where: { locationId: bin.id } });
    await prisma.location.delete({ where: { id: bin.id } });
    await prisma.product.delete({ where: { id: product.id } });

    await app.close();
}

bootstrap();
