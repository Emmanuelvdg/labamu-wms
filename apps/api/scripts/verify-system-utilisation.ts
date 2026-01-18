
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { UtilisationService } from '../src/inventory/utilisation.service';
import { PutawayService } from '../src/inventory/putaway.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

/**
 * System E2E Check for Warehouse Utilisation
 * Flow:
 * 1. Setup: Create Warehouse, constrained Bin, constrained Products.
 * 2. Constraint Test: Try to put away Oversized item -> Expect Block.
 * 3. Utilisation Test: Put away fits item -> Expect Success & PARTIAL status.
 * 4. Saturation Test: Fill bin to max -> Expect FULL status.
 * 5. Overflow Test: Try to add more -> Expect Block.
 * 6. API Test: Verify Batch API reflects these states.
 */
async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const utilService = app.get(UtilisationService);
    const putawayService = app.get(PutawayService);
    const inventoryService = app.get(InventoryService);
    const prisma = app.get(PrismaService);

    console.log('--- Starting System E2E Utilisation Check ---');

    // --- 1. SETUP ---
    // Ensure Warehouse
    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({ data: { name: 'E2E Util WH', code: 'E2E-UTIL' } as any });
    }

    // Create Constrained Bin (Max 100kg, 1m3)
    const bin = await prisma.location.create({
        data: {
            name: 'E2E Constrained Bin',
            code: `E2E-BIN-${Date.now()}`,
            warehouseId: warehouse.id,
            structuralType: 'BIN',
            type: 'INTERNAL',
            maxWeightKg: 100, // 100kg Limit
            maxVolume: 1,     // 1m3 Limit
            innerWidth: 1000, innerLength: 1000, innerHeight: 1000
        } as any
    });
    console.log(`Created Bin: ${bin.name} (Max 100kg)`);

    // Create Heavy Product (60kg)
    const heavyItem = await prisma.product.create({
        data: {
            name: 'Heavy Item',
            sku: `HVY-${Date.now()}`,
            weight: 60, // 60kg
            width: 100, height: 100, depth: 100,
            category: 'TEST',
            description: 'Heavy',
            status: 'ACTIVE'
        } as any
    });

    // Create Light Product (10kg)
    const lightItem = await prisma.product.create({
        data: {
            name: 'Light Item',
            sku: `LGT-${Date.now()}`,
            weight: 10, // 10kg
            width: 100, height: 100, depth: 100,
            category: 'TEST',
            description: 'Light',
            status: 'ACTIVE'
        } as any
    });

    try {
        // --- 2. CONSTRAINT TEST (OVERSIZED) ---
        console.log('\n--- Test 2: Putaway Oversized Item (2x Heavy = 120kg) ---');
        // Try to check capacity for 2 heavy items (120kg > 100kg)
        const check1 = await putawayService.checkLocationCapacity(bin.id, heavyItem.id, 2);
        if (check1.available) throw new Error('FAIL: Should have blocked 120kg putaway');
        console.log('PASS: Blocked 120kg putaway');


        // --- 3. UTILISATION TEST (PARTIAL) ---
        console.log('\n--- Test 3: Putaway 1 Heavy Item (60kg) ---');
        // 1. Check Capacity
        const check2 = await putawayService.checkLocationCapacity(bin.id, heavyItem.id, 1);
        if (!check2.available) throw new Error(`FAIL: Should accept 60kg. Reason: ${check2.reason}`);

        // 2. Execute Putaway (Simulate by creating inventory directly as PutawayService might assume tasks)
        // We'll use Prisma to insert "Stock"
        await prisma.productInventory.create({
            data: {
                productId: heavyItem.id,
                locationId: bin.id,
                warehouseId: warehouse.id,
                quantity: 1
            } as any
        });
        console.log('Action: Added 1 Heavy Item (60kg)');

        // 3. Verify Status via Batch API
        const batchReport1 = await utilService.getBatchUtilisation([bin.id]);
        const status1 = batchReport1[bin.id].status;
        const weight1 = batchReport1[bin.id].weightUtilisation;

        console.log(`Status: ${status1}, Weight: ${weight1}%`);
        if (status1 !== 'PARTIAL') throw new Error('FAIL: Status should be PARTIAL');
        if (weight1 !== 60) throw new Error(`FAIL: Weight should be 60%, got ${weight1}%`);
        console.log('PASS: Correct Partial Status');


        // --- 4. SATURATION TEST (FULL) ---
        console.log('\n--- Test 4: Fill to Capacity (Add 4 Light Items = +40kg -> Total 100kg) ---');
        // Check Capacity
        const check3 = await putawayService.checkLocationCapacity(bin.id, lightItem.id, 4);
        if (!check3.available) throw new Error(`FAIL: Should accept 40kg. Reason: ${check3.reason}`);

        // Add Inventory
        await prisma.productInventory.create({
            data: {
                productId: lightItem.id,
                locationId: bin.id,
                warehouseId: warehouse.id,
                quantity: 4
            } as any
        });
        console.log('Action: Added 4 Light Items (40kg)');

        // Verify Status
        const batchReport2 = await utilService.getBatchUtilisation([bin.id]);
        const status2 = batchReport2[bin.id].status;
        const weight2 = batchReport2[bin.id].weightUtilisation;

        console.log(`Status: ${status2}, Weight: ${weight2}%`);
        if (weight2 !== 100) throw new Error(`FAIL: Weight should be 100%, got ${weight2}%`);
        // Depending on logic, 100% might be FULL or PARTIAL (if strictly < 100). usually >= 100 is FULL.
        if (status2 !== 'FULL') throw new Error(`FAIL: Status should be FULL, got ${status2}`);
        console.log('PASS: Correct Full Status');


        // --- 5. OVERFLOW TEST ---
        console.log('\n--- Test 5: Attempt Overflow (Add 1 Light Item -> Total 110kg) ---');
        const check4 = await putawayService.checkLocationCapacity(bin.id, lightItem.id, 1);
        if (check4.available) throw new Error('FAIL: Should block overflow putaway');
        console.log('PASS: Blocked overflow');

    } catch (e) {
        console.error('TEST FAILED:', e);
        throw e;
    } finally {
        // Cleanup
        console.log('\n--- Cleanup ---');
        await prisma.productInventory.deleteMany({ where: { locationId: bin.id } });
        await prisma.location.delete({ where: { id: bin.id } });
        await prisma.product.deleteMany({ where: { id: { in: [heavyItem.id, lightItem.id] } } });
        await app.close();
    }
}

bootstrap();
