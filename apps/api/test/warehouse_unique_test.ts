import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaClient } from '@labamu/database';

async function runTest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const prisma = new PrismaClient();

    console.log('--- Starting Warehouse Uniqueness Test ---');

    try {
        // 1. Create Unique Warehouse - Should Succeed
        const uniqueName = `Unique Warehouse ${Date.now()}`;
        console.log(`1. Creating Warehouse "${uniqueName}"...`);
        const warehouse = await inventoryService.createWarehouse({
            name: uniqueName,
            shortName: 'UNIQ',
            address: '123 Unique St',
            companyId: 'comp_001',
            location: { lat: 0, lng: 0 },
            type: 'PHYSICAL'
        });
        console.log('   SUCCESS: Created Warehouse', warehouse.id);

        // 2. Create Duplicate Warehouse - Should Fail
        console.log(`2. Creating Duplicate Warehouse "${uniqueName}"...`);
        try {
            await inventoryService.createWarehouse({
                name: uniqueName,
                shortName: 'UNIQ2',
                address: '456 Duplicate St',
                companyId: 'comp_001',
                location: { lat: 0, lng: 0 },
                type: 'PHYSICAL'
            });
            console.error('   FAILURE: Duplicate Warehouse created unexpectedly!');
        } catch (e: any) {
            console.log('   SUCCESS: Caught expected error:', e.message);
        }

        // Clean up
        console.log('Cleaning up...');
        // We need to use the comprehensive cleanup logic here too if we want to be clean, 
        // but for a single test warehouse with no data, simple delete should work 
        // IF we delete the view location first? No, view location is cascade deleted?
        // Let's try simple delete. If it fails, we know why.
        // Actually, createWarehouse creates a view location.
        // Warehouse -> viewLocation (1:1).
        // If we delete Warehouse, does it delete Location?
        // Schema: viewLocation Location? @relation(...)
        // Usually requires manual delete or cascade.
        // I'll try to delete warehouse.
        try {
            await prisma.location.deleteMany({ where: { warehouseId: warehouse.id } });
            await prisma.warehouse.delete({ where: { id: warehouse.id } });
        } catch (e) {
            console.log('Cleanup warning:', e);
        }

    } catch (e) {
        console.error('Unexpected error during test execution:', e);
    } finally {
        await app.close();
        await prisma.$disconnect();
    }
}

runTest();
