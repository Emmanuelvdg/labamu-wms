
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

async function verify() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryService = app.get(InventoryService);
    const prisma = app.get(PrismaService);

    console.log('--- Verifying Location Address Logic ---');

    try {
        // 1. Create Root Warehouse
        const whName = `Util-Lab-${Date.now()}`;
        console.log(`Creating Warehouse: ${whName}`);
        const wh = await inventoryService.createLocation({
            name: whName,
            structuralType: 'WAREHOUSE',
            code: 'UL1' // Explicit code
        });
        console.log(`Warehouse Created: ${wh.name}, Code: ${(wh as any).code}, Address: ${(wh as any).fullAddress}`);

        if ((wh as any).fullAddress !== 'UL1') throw new Error('Root Address Mismatch');

        // 2. Create Child Zone (Auto-code)
        console.log('Creating Zone A...');
        const zone = await inventoryService.createLocation({
            name: 'Zone A',
            structuralType: 'ROOM',
            parentId: wh.id,
            warehouseId: wh.id
        });
        console.log(`Zone Created: ${(zone as any).code}, Address: ${(zone as any).fullAddress}`);
        // Expect slugified code: ZONE-A
        // Expect address: UL1.ZONE-A
        if ((zone as any).fullAddress !== 'UL1.ZONE-A') throw new Error(`Zone Address Mismatch: ${(zone as any).fullAddress}`);

        // 3. Create Child Row (Auto-code)
        console.log('Creating Row 1...');
        const row = await inventoryService.createLocation({
            name: 'Row 1',
            structuralType: 'ROW',
            parentId: zone.id,
            warehouseId: wh.id
        });
        console.log(`Row Created: ${(row as any).code}, Address: ${(row as any).fullAddress}`);
        if ((row as any).fullAddress !== 'UL1.ZONE-A.ROW-1') throw new Error(`Row Address Mismatch: ${(row as any).fullAddress}`);

        // 4. Update Row Code
        console.log('Updating Row 1 Code to ROW-99...');
        const updatedRow = await inventoryService.updateLocation(row.id, {
            code: 'ROW-99'
        });
        console.log(`Row Updated: ${(updatedRow as any).code}, Address: ${(updatedRow as any).fullAddress}`);
        if ((updatedRow as any).fullAddress !== 'UL1.ZONE-A.ROW-99') throw new Error('Update Address Mismatch');

        // 5. Test Physical Dimensions
        console.log('Updating Physical Dimensions...');
        const sizedRow = await inventoryService.updateLocation(row.id, {
            innerLength: 1000,
            maxWeightKg: 500
        });
        if ((sizedRow as any).innerLength !== 1000) throw new Error('Dimension Update Failed');
        console.log('Dimensions Verified.');

        console.log('--- Verification Passed ---');
    } catch (e) {
        console.error('Verification Failed:', e);
        process.exit(1);
    } finally {
        await app.close();
    }
}

verify().catch(console.error);
