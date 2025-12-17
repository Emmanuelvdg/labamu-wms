
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AttributeService } from '../src/settings/attribute.service';
import { InventoryService } from '../src/inventory/inventory.service';

async function verify() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const attributeService = app.get(AttributeService);
    const inventoryService = app.get(InventoryService);

    console.log('--- Verifying Location Attributes ---');

    try {
        // 1. Create Attribute Definition
        console.log('Creating Attribute Definition...');
        const attrName = `TestAttr-${Date.now()}`;
        const attr = await attributeService.createDefinition({
            name: attrName,
            type: 'SELECT',
            options: 'Option A, Option B'
        });
        console.log(`Created Attribute: ${attr.name} (${attr.type})`);

        // 2. Verify it exists
        const attrs = await attributeService.getDefinitions();
        const found = attrs.find(a => a.id === attr.id);
        if (!found) throw new Error('Attribute not found after creation');

        // 3. Create Location with this attribute
        console.log('Creating Location with Attribute...');
        // Need a parent first
        const warehouses = await inventoryService.getWarehouses();
        let warehouseId = warehouses[0]?.id;
        if (!warehouseId) {
            const w = await inventoryService.createWarehouse({ name: 'Attr Test Warehouse', location: 'Test', shortName: 'ATW', address: 'Test', companyId: '1', type: 'Physical' });
            warehouseId = w.id;
        }

        // Create a room
        const room = await inventoryService.createLocation({
            name: 'Attr Test Room',
            parentId: (await inventoryService.getLocationsTree())[0].id, // Just pick root
            type: 'INTERNAL',
            structuralType: 'ROOM',
            attributes: { [attrName]: 'Option A' }
        });

        console.log(`Created Location: ${room.name}`);
        console.log('Attributes:', room.attributes);

        const savedAttrs = typeof room.attributes === 'string' ? JSON.parse(room.attributes) : room.attributes;
        if (savedAttrs[attrName] !== 'Option A') throw new Error('Attribute value not saved correctly');

        console.log('SUCCESS: Location Attributes Verified.');

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await app.close();
    }
}

verify();
