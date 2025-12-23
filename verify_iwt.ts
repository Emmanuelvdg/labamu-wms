
import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/api/src/app.module';
import { PrismaService } from './apps/api/src/prisma.service';
import { FulfillmentService } from './apps/api/src/fulfillment/fulfillment.service';
import { OrderService } from './apps/api/src/order/order.service';

async function verifyIWT() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const fulfillmentService = app.get(FulfillmentService);
    const orderService = app.get(OrderService);

    console.log('--- Starting IWT Verification ---');

    console.log('1. Setting up Environment');

    // Use findFirst + create logic
    let whA = await prisma.warehouse.findFirst({ where: { name: 'IWT-WH-A' } });
    if (!whA) {
        whA = await prisma.warehouse.create({
            data: { name: 'IWT-WH-A', location: '{"lat":0,"lng":0}', type: 'INTERNAL' }
        });
    }

    let whB = await prisma.warehouse.findFirst({ where: { name: 'IWT-WH-B' } });
    if (!whB) {
        whB = await prisma.warehouse.create({
            data: { name: 'IWT-WH-B', location: '{"lat":10,"lng":10}', type: 'INTERNAL' }
        });
    }

    const product = await prisma.product.upsert({
        where: { sku: 'IWT-PROD-001' },
        update: {},
        create: { sku: 'IWT-PROD-001', name: 'IWT Test Product', category: 'TEST' }
    });

    // Reset Inventory
    await prisma.productInventory.deleteMany({ where: { productId: product.id } });

    // Add Stock to WH B (Source)
    await prisma.productInventory.create({
        data: { productId: product.id, warehouseId: whB.id, quantity: 10, reserved: 0 }
    });
    // Add Empty Stock record to WH A (Dest) to simulate visibility
    await prisma.productInventory.create({
        data: { productId: product.id, warehouseId: whA.id, quantity: 0, reserved: 0 }
    });


    // 2. Setup: Customer
    const cust = await prisma.customer.create({ data: { name: 'IWT Customer', latitude: 0, longitude: 0, address: 'Near A' } });


    // 3. Create Rule: Primary = WH A
    await prisma.fulfillmentRule.create({
        data: { name: 'Force-A', strategy: 'PRIMARY', warehouseId: whA.id, priority: 1 }
    });

    console.log('2. Creating Order (Qty 5)');
    const order = await orderService.createOrder({
        customerId: cust.id,
        priority: 'NORMAL',
        items: [{ productId: product.id, quantity: 5 }]
    });

    console.log(`Order Created: ${order.id}. WH: ${order.warehouseId} (Should be null initially)`);

    // 4. Trigger Allocation
    console.log('3. Allocating Order...');
    await fulfillmentService.allocateOrder(order.id);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });

    if (!updatedOrder) {
        console.error('FATAL: Order vanished.');
        return;
    }

    console.log(`Order Allocation Result: WH: ${updatedOrder.warehouseId}, Status: ${updatedOrder.fulfillmentStatus}`);

    if (updatedOrder.warehouseId !== whA.id) {
        console.error('FAILED: Order was not allocated to Primary Warehouse A.');
    }

    // 5. Check for Transfer Order
    const transfers = await prisma.transferOrder.findMany({
        where: { destinationWarehouseId: whA.id, createdAt: { gte: new Date(Date.now() - 10000) } },
        include: { items: true }
    });

    if (transfers.length > 0) {
        console.log('SUCCESS: Transfer Order Created!');
        console.log(JSON.stringify(transfers, null, 2));

        const toItem = transfers[0].items.find(i => i.productId === product.id);
        if (toItem && toItem.quantity === 5) {
            console.log('SUCCESS: Transfer Quantity is correct (5).');
        } else {
            console.error(`FAILED: Transfer Quantity incorrect. Expected 5.`);
        }

    } else {
        console.error('FAILED: No Transfer Order created for deficit.');
    }

    // Cleanup
    await prisma.fulfillmentRule.deleteMany({ where: { name: 'Force-A' } });

    await app.close();
}

verifyIWT();
