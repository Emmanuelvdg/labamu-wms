
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Latest Transfer Order ---');
    const transfers = await prisma.order.findMany({
        where: { type: 'TRANSFER' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { items: true }
    });

    if (transfers.length === 0) {
        console.log('No transfer orders found.');
    } else {
        const t = transfers[0];
        console.log(`Found Transfer: ${t.id}`);
        console.log(`Status: ${t.status}`); // Should be PENDING or APPROVED
        console.log(`Created At: ${t.createdAt}`);
        console.log(`Items: ${t.items.length}`);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
