import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function checkManualTask() {
    try {
        console.log('Checking manual PutawayTask creation...');

        // 1. Get or Create Warehouse/Product/Location
        const warehouse = await prisma.warehouse.findFirst() || await prisma.warehouse.create({
            data: { name: 'Test Warehouse', type: 'PHYSICAL' }
        });

        const product = await prisma.product.findFirst() || await prisma.product.create({
            data: { sku: 'TEST-SKU-' + Date.now(), name: 'Test Product', category: 'TEST' }
        });

        const location = await prisma.location.findFirst({ where: { warehouseId: warehouse.id } }) || await prisma.location.create({
            data: { name: 'Test Loc', type: 'INTERNAL', warehouseId: warehouse.id }
        });

        // 2. Create Session
        const session = await prisma.putawaySession.create({
            data: { warehouseId: warehouse.id, status: 'PLANNED' }
        });

        // 3. Create Task WITHOUT Receipt ID
        console.log('Attempting to create PutawayTask without receiptId...');
        const task = await prisma.putawayTask.create({
            data: {
                sessionId: session.id,
                productId: product.id,
                sourceLocationId: location.id,
                destinationLocationId: location.id,
                quantity: 10,
                status: 'PENDING'
                // receiptId omitted
            }
        });

        console.log('✅ Successfully created PutawayTask without receiptId:', task.id);

        // Cleanup
        await prisma.putawayTask.delete({ where: { id: task.id } });
        await prisma.putawaySession.delete({ where: { id: session.id } });

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkManualTask();
