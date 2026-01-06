import { PrismaClient } from '@labamu/database';
import { InventoryService } from '../../api/src/inventory/inventory.service';
import { PutawayService } from '../../api/src/inventory/putaway.service';
import { PackagingService } from '../../api/src/inventory/packaging.service';

// Mock NestJS dependency injection
const prisma = new PrismaClient();
// @ts-ignore
const prismaService: any = prisma;

const packagingService = new PackagingService(prismaService);
const putawayService = new PutawayService(prismaService);
const inventoryService = new InventoryService(prismaService, packagingService, putawayService);

async function checkBatchTrigger() {
    try {
        console.log('🧪 Verifying Manual Batch -> Putaway Trigger...');

        // 1. Setup Data
        const warehouse = await prisma.warehouse.create({
            data: { name: 'Trigger Test Warehouse', type: 'PHYSICAL' }
        });

        const product = await prisma.product.create({
            data: { sku: 'TRIGGER-SKU-' + Date.now(), name: 'Trigger Product', category: 'TEST' }
        });

        // Receiving Location
        const receivingLoc = await prisma.location.create({
            data: { name: 'Receiving Dock', type: 'INTERNAL', warehouseId: warehouse.id }
        });

        // Storage Location (Target)
        const storageLoc = await prisma.location.create({
            data: { name: 'Storage A-01', type: 'INTERNAL', warehouseId: warehouse.id, zonePriority: 10 }
        });

        // 1b. Create Putaway Rule (Force move to Storage)
        await prisma.putawayRule.create({
            data: {
                name: 'Force Storage',
                warehouseId: warehouse.id,
                strategy: 'FIXED',
                destinationLocationId: storageLoc.id,
                priority: 1
            }
        });

        console.log('Setup complete. Adding batch...');

        // 2. Add Batch
        const batch = await inventoryService.addBatch({
            productId: product.id,
            warehouseId: warehouse.id,
            locationId: receivingLoc.id,
            quantity: 50,
            costPerUnit: 10,
            purchaseDate: new Date(),
            batchNumber: 'MANUAL-BATCH-' + Date.now()
        });

        console.log(`✅ Batch created: ${batch.batchNumber}`);

        // 3. Verify Putaway Task
        // Wait a small moment for async operations if any (though ours is awaited)
        const tasks = await prisma.putawayTask.findMany({
            where: {
                productId: product.id,
                quantity: 50,
                status: 'PENDING'
            }
        });

        if (tasks.length > 0) {
            console.log('✅ Success! Putaway Task found:', tasks[0].id);
            console.log(`   Source: ${tasks[0].sourceLocationId}`);
            console.log(`   Destination: ${tasks[0].destinationLocationId}`);

            if (tasks[0].destinationLocationId === storageLoc.id) {
                console.log('   (Targeted correct optimal location)');
            } else {
                console.log('   (Targeted some location)');
            }

        } else {
            console.error('❌ FAILURE: No Putaway Task created for manual batch.');
        }

        // Cleanup
        // await prisma.warehouse.delete({ where: { id: warehouse.id } }); // Cascading delete usually blocked or risky in test
        console.log('Test complete.');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBatchTrigger();
