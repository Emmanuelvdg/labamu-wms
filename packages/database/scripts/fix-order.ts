import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Reverting Order #463EED6A to RESERVED...");

    // 1. Revert order status
    const updatedOrder = await prisma.order.updateMany({
        where: { id: { startsWith: '463eed6a' } },
        data: { status: 'RESERVED' }
    });
    console.log(`Updated ${updatedOrder.count} orders.`);

    // 2. Clear out the empty session since it's useless
    const deletedSession = await prisma.pickingSession.deleteMany({
        where: {
            id: { startsWith: 'c402ff37' },
            tasks: { none: {} } // only delete if no tasks
        }
    });
    console.log(`Deleted ${deletedSession.count} empty sessions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
