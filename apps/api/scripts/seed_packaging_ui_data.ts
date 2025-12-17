import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaClient } from '@labamu/database';

async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const prisma = new PrismaClient();

    console.log('--- Seeding Data for Packaging UI Tests ---');

    try {
        // 1. Create Warehouse
        const warehouseName = `UI Test Warehouse ${Date.now()}`;
        console.log(`Creating Warehouse: ${warehouseName}`);
        const warehouse = await inventoryService.createWarehouse({
            name: warehouseName,
            shortName: 'UTW',
            address: '123 Test St',
            companyId: 'comp_test_ui',
            location: {},
            type: 'PHYSICAL'
        });
        console.log(`   SUCCESS: Warehouse Created (ID: ${warehouse.id})`);

        // 2. Create Product
        const productName = "Packaging UI Test Product";
        const sku = `PKG-UI-${Date.now()}`;
        console.log(`Creating Product: ${productName} (${sku})`);
        const product = await inventoryService.createProduct({
            sku: sku,
            name: productName,
            category: 'TEST',
            classification: 'A',
            type: 'Stock',
            unitOfMeasure: 'Unit',
            averageCost: 10,
            status: 'Active'
        });
        console.log(`   SUCCESS: Product Created (ID: ${product.id})`);

        console.log('\n--- Seed Complete ---');
        console.log(`You can now navigate to:`);
        console.log(`1. Product Packaging: /inventory/products/${product.id}/packaging`);
        console.log(`2. Locations: /inventory/locations (Select "${warehouseName}" as parent)`);

    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        await app.close();
        await prisma.$disconnect();
    }
}

seed();
