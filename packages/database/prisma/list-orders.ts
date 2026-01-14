
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        include: { customer: true }
    });
    console.log('Found orders:', orders.length);
    orders.forEach(o => {
        console.log(`${o.id}: ${o.status} - ${o.customer?.name}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
