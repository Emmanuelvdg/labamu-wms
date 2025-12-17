import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        where: { customerId: 'cust_001' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 1
    });
    console.log('Latest Order:', JSON.stringify(orders[0], null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
