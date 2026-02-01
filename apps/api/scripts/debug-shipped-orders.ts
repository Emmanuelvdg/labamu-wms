
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function checkShippedOrders() {
    console.log('Checking for SHIPPED orders...');

    const count = await prisma.order.count({
        where: { status: 'SHIPPED' }
    });
    console.log(`Total SHIPPED orders: ${count}`);

    const recent = await prisma.order.findMany({
        where: { status: 'SHIPPED' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, status: true, createdAt: true, updatedAt: true }
    });

    console.log('Most recent SHIPPED orders:');
    recent.forEach(o => {
        console.log(`ID: ${o.id}, Created: ${o.createdAt}, Updated: ${o.updatedAt}`);
    });
}

checkShippedOrders()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
