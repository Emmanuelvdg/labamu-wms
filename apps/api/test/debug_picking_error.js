
const { PrismaClient } = require('../../../packages/database');
const prisma = new PrismaClient();

async function debugPickingError() {
    console.log('Debugging Picking Session Error...');

    try {
        // 1. Check for RESERVED orders
        const reservedOrders = await prisma.order.findMany({
            where: { status: 'RESERVED' }
        });
        console.log(`Found ${reservedOrders.length} RESERVED orders.`);
        if (reservedOrders.length > 0) {
            console.log('Sample Order:', reservedOrders[0]);
        }

        // 2. Check Warehouses
        const warehouses = await prisma.warehouse.findMany();
        console.log(`Found ${warehouses.length} warehouses.`);
        if (warehouses.length > 0) {
            console.log('Sample Warehouse:', warehouses[0]);
        }

        // 3. Simulate createSession logic
        if (warehouses.length > 0) {
            const warehouseId = warehouses[0].id;
            console.log(`Attempting to find orders for Warehouse: ${warehouseId}`);

            const orders = await prisma.order.findMany({
                where: {
                    warehouseId,
                    status: 'RESERVED',
                },
                take: 50,
                include: {
                    items: { include: { product: true } },
                    reservations: true
                }
            });
            console.log(`Found ${orders.length} orders for this warehouse.`);

            if (orders.length === 0) {
                console.log('ERROR WOULD BE THROWN: No orders available for picking');
            } else {
                console.log('Session creation would proceed.');
                // Check stock for first order item
                const order = orders[0];
                if (order.items.length > 0) {
                    const item = order.items[0];
                    console.log(`Checking stock for Product ${item.productId} (Qty: ${item.quantity})`);
                    const stock = await prisma.productInventory.findFirst({
                        where: {
                            productId: item.productId,
                            warehouseId,
                            quantity: { gte: item.quantity }
                        },
                        include: { location: true }
                    });
                    console.log('Stock found:', stock ? 'YES' : 'NO');
                    if (stock) console.log('Location:', stock.location);
                }
            }
        }

    } catch (error) {
        console.error('Debug Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugPickingError();
