
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const prisma = app.get(PrismaService);

    console.log('--- Seeding Data for Heatmap UI ---');

    // 1. Warehouse
    const whName = 'Heatmap UI Warehouse';
    let warehouse = await prisma.warehouse.findFirst({ where: { name: whName } });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                name: whName,
                type: 'INTERNAL'
            } as any
        });
    }
    console.log(`Warehouse Entity: ${warehouse.id}`);

    // 4. Cleanup existing data to ensure fresh state
    const existingWhLoc = await prisma.location.findFirst({
        where: { name: whName, structuralType: 'WAREHOUSE' }
    });
    if (existingWhLoc) {
        // Delete children first (bins)
        const children = await prisma.location.findMany({ where: { parentId: existingWhLoc.id } });
        for (const child of children) {
            await prisma.productInventory.deleteMany({ where: { locationId: child.id } });
            await prisma.location.delete({ where: { id: child.id } });
        }
        await prisma.location.delete({ where: { id: existingWhLoc.id } });
        console.log('Cleaned up existing Heatmap UI locations.');
    }

    let warehouseLocation = await prisma.location.create({
        data: {
            name: whName,
            code: 'WH-HEATMAP',
            warehouseId: warehouse.id,
            structuralType: 'WAREHOUSE',
            type: 'VIEW', // Changed to VIEW to match system convention
        } as any
    });
    console.log(`Warehouse Location: ${warehouseLocation.id}`);

    // 2. Mapped Room (Required for Floor Plan)
    const room = await prisma.location.create({
        data: {
            name: 'Visual Room',
            code: 'VIS-ROOM',
            warehouseId: warehouse.id,
            parentId: warehouseLocation.id,
            structuralType: 'ROOM',
            type: 'INTERNAL',
        } as any
    });
    console.log(`Created Visual Room: ${room.id}`);

    // 3. Mapped Bin (Empty)
    // x, y, width, height required for floor plan
    const binCode = 'VIS-BIN-01';

    // Note: Old cleanup handled deletion by Warehouse Parent, so we don't need extra cleanup logic here for the bin specifically 
    // as it would have been deleted in step 4 if attached to the old warehouse location structure.

    let bin = await prisma.location.findFirst({ where: { code: binCode, warehouseId: warehouse.id } });

    if (bin) {
        // Reset inventory
        await prisma.productInventory.deleteMany({ where: { locationId: bin.id } });
        await prisma.location.delete({ where: { id: bin.id } }); // Re-create to ensure clean slate
    }

    bin = await prisma.location.create({
        data: {
            name: 'Visual Bin 01',
            code: binCode,
            warehouseId: warehouse.id,
            parentId: room.id, // Link to Room
            structuralType: 'BIN',
            type: 'INTERNAL',
            // Physical Constraints
            maxWeightKg: 100,
            maxVolume: 1,
            // Visual Coordinates (x,y in px)
            x: 200, y: 200, width: 60, height: 60, rotation: 0
        } as any
    });
    console.log(`Created Mapped Bin: ${bin.name} at (200, 200)`);

    // 3. Product
    const sku = 'VIS-PROD-01';
    let product = await prisma.product.findFirst({ where: { sku } });
    if (!product) {
        product = await prisma.product.create({
            data: {
                name: 'Visual Product',
                sku,
                weight: 50, // 50kg (50% of bin)
                category: 'TEST',
                description: 'For Heatmap',
                status: 'ACTIVE'
            } as any
        });
    }
    console.log(`Product: ${product.sku} (50kg)`);

    // 4. Add Inventory (50% Utilization)
    await prisma.productInventory.create({
        data: {
            productId: product.id,
            locationId: bin.id,
            warehouseId: warehouse.id,
            quantity: 1
        } as any
    });
    console.log('Added 1 Unit (50kg) to Bin');

    await app.close();
}

bootstrap();
