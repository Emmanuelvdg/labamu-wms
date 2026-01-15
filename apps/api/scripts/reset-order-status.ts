
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function resetOrder() {
    const orderId = 'deae9245-195f-417e-81e4-ec99c7b540ad';

    // Check current status
    const order = await prisma.order.findUnique({
        where: { id: orderId }
    });

    console.log(`Current Order Status: ${order?.status}`);

    if (order?.status === 'PICKING') {
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'RESERVED' }
        });
        console.log(`Reset Order Status to: ${updated.status}`);
    } else {
        console.log('Order is already in correct state or not found.');
    }
}

resetOrder()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
