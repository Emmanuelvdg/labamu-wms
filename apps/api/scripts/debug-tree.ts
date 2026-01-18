
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { InventoryService } from '../src/inventory/inventory.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const service = app.get(InventoryService);

    console.log('Fetching Locations Tree...');
    try {
        const tree = await service.getLocationsTree();
        console.log(`Fetched ${tree.length} root items.`);

        // Try to stringify to check for cycles
        const json = JSON.stringify(tree, null, 2);
        console.log('JSON Stringify successful.');
        // console.log(json.substring(0, 500) + '...');

        // Check for Heatmap Warehouse
        const findWarehouse = (nodes: any[]): any => {
            for (const node of nodes) {
                if (node.name === 'Heatmap UI Warehouse' && node.structuralType === 'WAREHOUSE') return node;
                if (node.children) {
                    const found = findWarehouse(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const heatmapWh = findWarehouse(tree);
        if (heatmapWh) {
            console.log('✅ Heatmap UI Warehouse found in tree.');
            console.log(JSON.stringify(heatmapWh, null, 2));
        } else {
            console.error('❌ Heatmap UI Warehouse NOT found in tree.');
        }

    } catch (error) {
        console.error('Error:', error);
    }

    await app.close();
}

bootstrap();
