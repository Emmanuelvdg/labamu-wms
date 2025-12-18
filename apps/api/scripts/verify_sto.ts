
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { StoService } from '../src/sto/sto.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const stoService = app.get(StoService);

    console.log('Starting STO Verification...');

    try {
        // 1. Ensure Destination Warehouse exists
        let warehouses = await inventoryService.getWarehouses();
        let destWarehouse = warehouses[0];
        if (!destWarehouse) {
            console.log('Creating Destination Warehouse...');
            destWarehouse = await inventoryService.createWarehouse({
                name: 'Main Warehouse',
                shortName: 'MW',
                address: '123 Main St',
                companyId: 'COMP1',
                location: { lat: 0, lng: 0 },
                type: 'INTERNAL'
            });
        }
        console.log(`Using Dest Warehouse: ${destWarehouse.name} (${destWarehouse.id})`);

        // 2. Ensure Product exists
        let products = await inventoryService.getProducts();
        let product = products[0];
        if (!product) {
            console.log('Creating Product...');
            product = await inventoryService.createProduct({
                name: 'STO Test Product',
                sku: 'STO-SKU-001',
                category: 'Test',
                classification: 'A',
                type: 'Finished',
                unitOfMeasure: 'Unit',
                averageCost: 10,
                status: 'Active'
            });
        }
        console.log(`Using Product: ${product.name} (${product.sku})`);

        // 3. Create STO via Service (Direct Call to verify logic first)
        // We can also use fetch to call the controller, but direct service call is faster for script.
        // Actually, let's call the service directly to verify logic.
        console.log('Creating Inbound STO...');
        const stoResult = await stoService.createInboundSto({
            externalId: 'EXT-STO-001',
            sourceSystem: 'MRP',
            destinationWarehouseId: destWarehouse.id,
            items: [
                { sku: product.sku, quantity: 50 }
            ]
        });

        console.log('STO Created:', stoResult);

        if (stoResult.status !== 'PLANNED') throw new Error('STO Status mismatch');
        if (!stoResult.transferId) throw new Error('STO Transfer ID missing');

        console.log('SUCCESS: STO Verification Passed!');

    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
