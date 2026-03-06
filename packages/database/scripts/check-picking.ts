import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        where: { id: { startsWith: '463eed6a' } },
        include: { items: true, pickingTasks: true }
    });

    console.log("Found Order:", JSON.stringify(orders, null, 2));

    const session = await prisma.pickingSession.findFirst({
        where: { id: { startsWith: 'c402ff37' } },
        include: { tasks: true }
    });

    console.log("Found Session:", JSON.stringify(session, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
