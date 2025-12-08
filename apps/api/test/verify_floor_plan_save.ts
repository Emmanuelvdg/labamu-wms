
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);

    console.log('--- Verifying Floor Plan Save ---');

    try {
        // 1. Create a test warehouse, room, row, and bay
        console.log('Creating test locations...');
        const warehouse = await inventoryService.createLocation({
            name: 'Test Warehouse FP',
            type: 'INTERNAL',
            structuralType: 'WAREHOUSE'
        });

        const room = await inventoryService.createLocation({
            name: 'Test Room FP',
            type: 'INTERNAL',
            structuralType: 'ROOM',
            parentId: warehouse.id,
            warehouseId: warehouse.id
        });

        const row = await inventoryService.createLocation({
            name: 'Test Row FP',
            type: 'INTERNAL',
            structuralType: 'ROW',
            parentId: room.id,
            warehouseId: warehouse.id
        });

        const bay = await inventoryService.createLocation({
            name: 'Test Bay FP',
            type: 'INTERNAL',
            structuralType: 'BAY',
            parentId: row.id,
            warehouseId: warehouse.id
        });

        console.log(`Created Bay: ${bay.id}`);

        // 2. Update with coordinates
        console.log('Updating with coordinates...');
        const updatedBay = await inventoryService.updateLocation(bay.id, {
            x: 100,
            y: 200,
            width: 60,
            height: 80,
            rotation: 90
        });

        console.log('Updated Bay:', updatedBay);

        // 3. Verify
        if (updatedBay.x === 100 && updatedBay.y === 200 && updatedBay.rotation === 90) {
            console.log('SUCCESS: Coordinates saved correctly.');
        } else {
            console.error('FAILURE: Coordinates NOT saved correctly.');
            console.log('Expected: x=100, y=200, rotation=90');
            console.log(`Actual: x=${updatedBay.x}, y=${updatedBay.y}, rotation=${updatedBay.rotation}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await app.close();
    }
}

run();
