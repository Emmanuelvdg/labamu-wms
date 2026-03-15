import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Customers:');
    console.log(await prisma.customer.findMany({ select: { id: true, name: true } }));
    console.log('\nSales Orders:');
    const orders = await prisma.order.findMany({
        where: { type: 'SALES' },
        select: { id: true, status: true, fulfillmentStatus: true, items: { select: { product: { select: { name: true } }, quantity: true } } }
    });
    console.log(JSON.stringify(orders, null, 2));
    console.log('\nPicking Sessions:');
    const picking = await prisma.pickingSession.findMany({
        select: { id: true, status: true, tasks: { select: { status: true, pickedQuantity: true } } }
    });
    console.log(JSON.stringify(picking, null, 2));
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
