import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaClient } from '@labamu/database';

async function runTest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const prisma = new PrismaClient();

    console.log('--- Starting Hierarchy Enforcement Test ---');

    try {
        // 1. Create Root (WAREHOUSE) - Should Succeed
        console.log('1. Creating Root WAREHOUSE...');
        const warehouse = await inventoryService.createLocation({
            name: 'Test Root Warehouse',
            structuralType: 'WAREHOUSE'
        });
        console.log('   SUCCESS: Created Warehouse', warehouse.id);

        // 2. Create Orphan ROOM - Should Fail
        console.log('2. Creating Orphan ROOM...');
        try {
            await inventoryService.createLocation({
                name: 'Orphan Room',
                structuralType: 'ROOM'
            });
            console.error('   FAILURE: Orphan ROOM created unexpectedly!');
        } catch (e: any) {
            console.log('   SUCCESS: Caught expected error:', e.message);
        }

        // 3. Create Valid ROOM (Child of WAREHOUSE) - Should Succeed
        console.log('3. Creating Valid ROOM (Child of WAREHOUSE)...');
        const room = await inventoryService.createLocation({
            name: 'Valid Room',
            structuralType: 'ROOM',
            parentId: warehouse.id
        });
        console.log('   SUCCESS: Created Room', room.id);

        // 4. Create Invalid Hierarchy (ROW child of WAREHOUSE) - Should Fail
        console.log('4. Creating Invalid Hierarchy (ROW child of WAREHOUSE)...');
        try {
            await inventoryService.createLocation({
                name: 'Invalid Row',
                structuralType: 'ROW',
                parentId: warehouse.id
            });
            console.error('   FAILURE: Invalid Hierarchy created unexpectedly!');
        } catch (e: any) {
            console.log('   SUCCESS: Caught expected error:', e.message);
        }

        // 5. Create Valid ROW (Child of ROOM) - Should Succeed
        console.log('5. Creating Valid ROW (Child of ROOM)...');
        const row = await inventoryService.createLocation({
            name: 'Valid Row',
            structuralType: 'ROW',
            parentId: room.id
        });
        console.log('   SUCCESS: Created Row', row.id);

        // Clean up
        console.log('Cleaning up...');
        await prisma.location.deleteMany({
            where: {
                id: { in: [row.id, room.id, warehouse.id] }
            }
        });

    } catch (e) {
        console.error('Unexpected error during test execution:', e);
    } finally {
        await app.close();
        await prisma.$disconnect();
    }
}

runTest();
