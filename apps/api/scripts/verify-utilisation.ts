
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { UtilisationService } from '../src/inventory/utilisation.service';
import { PutawayService } from '../src/inventory/putaway.service';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const utilisationService = app.get(UtilisationService);
    const putawayService = app.get(PutawayService);
    const prisma = app.get(PrismaService);

    console.log('--- Starting Utilisation Logic Verification ---');

    // 1. Setup Test Data
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) throw new Error('No warehouse found');

    const product = await prisma.product.create({
        data: {
            name: 'Util Test Product',
            sku: `UTIL-TEST-${Date.now()}`,
            width: 100, // 100mm = 10cm
            height: 100,
            depth: 100,
            weight: 10, // 10kg
            category: 'TEST_CATEGORY',
            description: 'Test Product',
            classification: 'A',
            unitOfMeasure: 'EA',
            isStockable: true,
            status: 'ACTIVE',
            type: 'PRODUCT'
        } as any
    });

    const location = await prisma.location.create({
        data: {
            name: 'Verification Bin',
            warehouseId: warehouse.id,
            type: 'INTERNAL',
            code: `VER-${Date.now()}`,
            // Constraints
            maxWeightKg: 100, // 100kg
            innerLength: 1000, // 1000mm
            innerWidth: 1000,
            innerHeight: 1000,
            maxVolume: 1, // 1m3 (1000*1000*1000 mm3)
        } as any // Bypass strict typing for new fields if needed
    });

    console.log(`Created Test Location: ${location.name} (${location.id})`);
    console.log(`Created Test Product: ${product.name} (${product.id})`);

    // 2. Test Empty State
    let report = await utilisationService.getLocationUtilisation(location.id);
    console.log(`Empty Status: ${report.status} (Expected: EMPTY)`);
    if (report.status !== 'EMPTY') throw new Error('Initial status should be EMPTY');

    // 3. Add Inventory (5 items = 50kg, small volume)
    // 5 items * 10kg = 50kg (50% utilization of weight)
    await prisma.productInventory.create({
        data: {
            productId: product.id,
            locationId: location.id,
            quantity: 5,
            warehouseId: warehouse.id
        }
    });

    report = await utilisationService.getLocationUtilisation(location.id);
    console.log(`Partial Status: ${report.status}`);
    console.log(`Weight Util: ${report.weightUtilisation}% (Expected: 50%)`);

    if (Math.abs(report.weightUtilisation - 50) > 0.1) throw new Error('Weight calc incorrect');
    if (report.status !== 'PARTIAL') throw new Error('Status should be PARTIAL');

    // 4. Test Overfill Prevention (Try to add 6 items = 60kg. Total would be 110kg > 100kg limit)
    const checkStart = Date.now();
    const canAccept = await utilisationService.canAccept(location.id, product.id, 6);
    console.log(`Can Accept 6 more (60kg)? ${canAccept.allowed} (Expected: false)`);
    console.log(`Reason: ${canAccept.reason}`);

    if (canAccept.allowed) throw new Error('Should reject overfill');

    // 5. Test Putaway Integration
    const putawayCheck = await putawayService.checkLocationCapacity(location.id, product.id, 6);
    console.log(`Putaway Service Check: ${putawayCheck.available} (Expected: false)`);

    if (putawayCheck.available) throw new Error('Putaway service should pass through utilisation check');

    // Cleanup
    await prisma.productInventory.deleteMany({ where: { locationId: location.id } });
    await prisma.location.delete({ where: { id: location.id } });
    await prisma.product.delete({ where: { id: product.id } });

    console.log('--- Verification PASSED ---');
    await app.close();
}

bootstrap();
