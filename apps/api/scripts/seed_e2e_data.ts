
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PurchaseOrderService } from '../src/purchase-order/purchase-order.service';

async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const poService = app.get(PurchaseOrderService);

    console.log('--- Seeding E2E Data ---');

    try {
        // 1. Warehouse & Location
        let warehouses = await inventoryService.getWarehouses();
        if (warehouses.length === 0) {
            console.log('Creating Warehouse...');
            const w = await inventoryService.createWarehouse({
                name: 'E2E Warehouse',
                shortName: 'E2E',
                address: 'Test City',
                companyId: '1',
                location: 'Test City',
                type: 'Physical'
            });
            await inventoryService.createLocation({ name: 'Input Zone', type: 'INTERNAL', warehouseId: w.id });
        } else {
            console.log('Warehouse exists.');
        }

        // 2. Supplier
        let suppliers = await poService.getSuppliers();
        if (suppliers.length === 0) {
            console.log('Creating Supplier...');
            await inventoryService.createSupplier({ name: 'E2E Supplier', contactInfo: 'e2e@supplier.com' });
        } else {
            console.log('Supplier exists.');
        }

        // 3. Product
        let products = await inventoryService.getProducts({});
        const e2eProduct = products.find(p => p.sku === 'E2E-PROD-001');
        if (!e2eProduct) {
            console.log('Creating Product...');
            await inventoryService.createProduct({
                name: 'E2E Test Product',
                sku: 'E2E-PROD-001',
                description: 'For E2E Testing',
                price: 100,
                cost: 50,
                category: 'Test',
                classification: 'A',
                type: 'Stock',
                unitOfMeasure: 'Unit',
                averageCost: 50,
                status: 'Active'
            });
        } else {
            console.log('Product exists.');
        }

        console.log('SUCCESS: Data Seeded.');

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await app.close();
    }
}

seed();
