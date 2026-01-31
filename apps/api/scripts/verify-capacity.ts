
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const prisma = app.get(PrismaService);

    console.log('--- Starting Capacity Verification ---');

    // Create Warehouse
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const warehouse = await inventoryService.createWarehouse({
        name: `TestCap${timestamp}`,
        shortName: `TC${timestamp}`,
        address: 'Test Addr',
        companyId: 'test-co',
        location: { lat: 0, lng: 0 },
        type: 'PHYSICAL'
    });

    // Create Location with Cap
    const location = await inventoryService.createLocation({
        name: `Bin${timestamp}`,
        code: `BIN${timestamp}`, // Explicit code
        warehouseId: warehouse.id,
        parentId: (JSON.parse(warehouse.location) as any).id,
        type: 'INTERNAL',
        maxWeightKg: 10
    });
    // Wait, createLocation above might fail if parentId is wrong. 
    // Let's rely on finding a location.
    const stockLoc = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, name: 'Stock' } });
    if (!stockLoc) throw new Error('Stock loc not found');

    // Update Stock Location to have capacity 10kg
    await prisma.location.update({
        where: { id: stockLoc.id },
        data: { maxWeightKg: 10 }
    });
    console.log(`Set maxWeight to 10kg for location ${stockLoc.name}`);

    // Create Product (2kg)
    const product = await inventoryService.createProduct({
        sku: `P-${timestamp}`,
        name: 'Heavy Item',
        category: 'Test',
        weight: '2', // 2kg
        price: 100
    });

    // 2. Add Stock (Start with 4 items = 8kg) - Should succeed
    console.log('Adding 4 items (8kg)...');
    await inventoryService.addBatch({
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: stockLoc.id, // Direct add to restricted location
        quantity: 4,
        costPerUnit: 10,
        purchaseDate: new Date()
    });
    console.log('✅ Added 4 items successfully.');

    // 3. Try to Transfer/Add more to exceed capacity
    // Let's try createTransfer (Source -> Dest)
    // First we need a source.
    const sourceLoc = await inventoryService.createLocation({
        name: `Src${timestamp}`,
        code: `SRC${timestamp}`,
        warehouseId: warehouse.id,
        type: 'INTERNAL',
    });

    // Add stock to source
    const batch = await inventoryService.addBatch({
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: sourceLoc.id,
        quantity: 2, // 4kg
        costPerUnit: 10,
        purchaseDate: new Date()
    });

    console.log('Attempting to transfer 2 items (4kg) to Stock (Current: 8kg/10kg)... should fail.');

    try {
        await inventoryService.createTransfer({
            productId: product.id,
            sourceLocationId: sourceLoc.id,
            destinationLocationId: stockLoc.id,
            quantity: 2
        });
        console.error('❌ FAILURE: Transfer succeeded but should have failed due to capacity!');
    } catch (e: any) {
        if (e.message.includes('Capacity Limit Reached') || e.status === 400) {
            console.log('✅ SUCCESS: Caught expected error:', e.message);
        } else {
            console.error('❌ FAILURE: Caught unexpected error:', e);
        }
    }

    // Cleanup
    // await prisma.warehouse.delete({ where: { id: warehouse.id } }); // Cascades? Maybe not safe in dev.

    await app.close();
}

bootstrap().catch(err => console.error(err));
