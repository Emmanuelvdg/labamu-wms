import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPOs() {
    console.log('Fetching Purchase Orders...');
    const pos = await prisma.purchaseOrder.findMany({
        include: {
            supplier: true,
            items: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5
    });

    console.log(JSON.stringify(pos, null, 2));
}

checkPOs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
