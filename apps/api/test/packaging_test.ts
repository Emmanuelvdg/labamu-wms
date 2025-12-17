import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PackagingService } from '../src/inventory/packaging.service';
import { PrismaClient } from '@labamu/database';

async function runTest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const packagingService = app.get(PackagingService);
    const prisma = new PrismaClient();

    console.log('--- Starting Packaging & Storage Test ---');

    try {
        // 1. Setup Data
        const warehouseName = `Pkg Test Warehouse ${Date.now()}`;
        const warehouse = await inventoryService.createWarehouse({
            name: warehouseName,
            shortName: 'PTW',
            address: 'Test Address',
            companyId: 'comp_1',
            location: {},
            type: 'PHYSICAL'
        });
        const warehouseId = warehouse.id;

        const product = await inventoryService.createProduct({
            sku: `PKG-PROD-${Date.now()}`,
            name: 'Packaging Test Product',
            category: 'TEST',
            classification: 'A',
            type: 'Stock',
            unitOfMeasure: 'Unit',
            averageCost: 10,
            status: 'Active'
        });

        // 2. Create Packaging (Box - Refrigerated)
        console.log('2. Creating Packaging...');
        const packaging = await packagingService.createPackaging({
            name: 'Refrigerated Box',
            type: 'BOX',
            productId: product.id,
            quantity: 10,
            storageRequirements: ['refrigerated']
        });
        console.log('   SUCCESS: Created Packaging', packaging.id);

        // 3. Create Locations
        console.log('3. Creating Locations...');
        // Dry Location
        const dryLoc = await prisma.location.create({
            data: {
                name: 'Dry Shelf',
                type: 'INTERNAL',
                structuralType: 'SHELF',
                warehouseId: warehouseId,
                attributes: JSON.stringify({ refrigerated: false }),
                supportedPackaging: JSON.stringify(['BOX'])
            }
        });

        // Fridge Location
        const fridgeLoc = await prisma.location.create({
            data: {
                name: 'Fridge Shelf',
                type: 'INTERNAL',
                structuralType: 'SHELF',
                warehouseId: warehouseId,
                attributes: JSON.stringify({ refrigerated: true }),
                supportedPackaging: JSON.stringify(['BOX'])
            }
        });

        // Pallet Rack (No Box support)
        const palletLoc = await prisma.location.create({
            data: {
                name: 'Pallet Rack',
                type: 'INTERNAL',
                structuralType: 'SHELF',
                warehouseId: warehouseId,
                attributes: JSON.stringify({ refrigerated: true }),
                supportedPackaging: JSON.stringify(['PALLET'])
            }
        });

        // 4. Test Putaway Logic
        console.log('4. Testing Putaway Logic...');

        // Should go to Fridge (matches 'refrigerated' and 'BOX')
        const bestLoc = await inventoryService.findPutawayLocation(warehouseId, product.id, packaging.id);

        if (bestLoc && bestLoc.id === fridgeLoc.id) {
            console.log('   SUCCESS: Selected Fridge Location (Matches Req + Pkg)');
        } else {
            console.error('   FAILURE: Selected', bestLoc ? bestLoc.name : 'None', 'Expected Fridge Shelf');
        }

        // Test Pallet Item (should go to Pallet Rack)
        const palletPkg = await packagingService.createPackaging({
            name: 'Pallet Unit',
            type: 'PALLET',
            productId: product.id,
            quantity: 100,
            storageRequirements: ['refrigerated']
        });

        const bestPalletLoc = await inventoryService.findPutawayLocation(warehouseId, product.id, palletPkg.id);
        if (bestPalletLoc && bestPalletLoc.id === palletLoc.id) {
            console.log('   SUCCESS: Selected Pallet Rack (Matches Pallet Pkg)');
        } else {
            console.error('   FAILURE: Selected', bestPalletLoc ? bestPalletLoc.name : 'None', 'Expected Pallet Rack');
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    } finally {
        await app.close();
        await prisma.$disconnect();
    }
}

runTest();
