
const { PrismaClient } = require('../../../packages/database');
const prisma = new PrismaClient();

async function verifyPickingWorkflow() {
    console.log('Available Models:', Object.keys(prisma));
    console.log('Starting Picking Workflow Verification...');

    try {
        // 1. Setup Data
        const warehouse = await prisma.warehouse.create({
            data: {
                name: 'Picking Test Warehouse',
                location: JSON.stringify({ lat: 0, lng: 0 }),
                type: 'INTERNAL'
            }
        });
        console.log('Created Warehouse:', warehouse.id);

        const location = await prisma.location.create({
            data: {
                name: 'Zone-A-01',
                type: 'INTERNAL',
                warehouseId: warehouse.id
            }
        });

        const product = await prisma.product.create({
            data: {
                sku: `PICK-TEST-${Date.now()}`,
                name: 'Picking Test Product',
                category: 'Test',
                isStockable: true
            }
        });

        // Add Stock
        await prisma.productInventory.create({
            data: {
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: location.id,
                quantity: 100
            }
        });

        // 2. Create Order (should be RESERVED)
        const order = await prisma.order.create({
            data: {
                customerId: 'Test Customer',
                status: 'RESERVED',
                priority: 'NORMAL',
                warehouseId: warehouse.id,
                items: {
                    create: {
                        productId: product.id,
                        quantity: 5
                    }
                },
                reservations: {
                    create: {
                        productId: product.id,
                        quantity: 5,
                        reservationStrategy: 'FIFO'
                    }
                }
            }
        });
        console.log('Created Order:', order.id, 'Status:', order.status);

        // 3. Create Picking Session (via Service Logic - simulating API)
        // We'll use the API endpoint logic directly or call the service if we could import it, 
        // but here we'll simulate the DB operations the service would do to verify the model works.

        // Create Session
        const session = await prisma.pickingSession.create({
            data: {
                warehouseId: warehouse.id,
                strategy: 'BATCH',
                status: 'IN_PROGRESS'
            }
        });
        console.log('Created Session:', session.id);

        // Create Task
        const task = await prisma.pickingTask.create({
            data: {
                sessionId: session.id,
                orderId: order.id,
                productId: product.id,
                sourceLocationId: location.id,
                quantity: 5,
                status: 'PENDING'
            }
        });
        console.log('Created Task:', task.id);

        // Update Order to PICKING
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PICKING' }
        });

        // 4. Simulate Picking (Partial Exception)
        // Let's say we only found 3
        await prisma.pickingTask.update({
            where: { id: task.id },
            data: {
                pickedQuantity: 3,
                status: 'PARTIALLY_PICKED',
                exceptionReason: 'Missing 2 items'
            }
        });
        console.log('Updated Task with Exception');

        // 5. Complete Session
        // Logic: Check tasks, update order
        const sessionTasks = await prisma.pickingTask.findMany({ where: { sessionId: session.id } });
        const hasExceptions = sessionTasks.some(t => t.status === 'FAILED' || t.status === 'PARTIALLY_PICKED');

        let newOrderStatus = 'PICKING';
        if (hasExceptions) newOrderStatus = 'EXCEPTION';
        else newOrderStatus = 'PACKING';

        await prisma.order.update({
            where: { id: order.id },
            data: { status: newOrderStatus }
        });
        console.log('Updated Order Status to:', newOrderStatus);

        await prisma.pickingSession.update({
            where: { id: session.id },
            data: { status: 'COMPLETED' }
        });

        // 6. Final Verification
        const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
        if (finalOrder.status === 'EXCEPTION') {
            console.log('SUCCESS: Order correctly moved to EXCEPTION status.');
        } else {
            console.error('FAILURE: Order status is', finalOrder.status);
        }

    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPickingWorkflow();
