
import { PrismaClient } from '../../../packages/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning Stuck Picking Orders ---');

    // 1. Find Orders stuck in PICKING
    const stuckOrders = await prisma.order.findMany({
        where: { status: 'PICKING' },
        include: { pickingTasks: true }
    });

    console.log(`Found ${stuckOrders.length} orders in PICKING status.`);

    for (const order of stuckOrders) {
        // If no tasks, it's definitely stuck/zombie
        if (order.pickingTasks.length === 0) {
            console.log(`Resetting Order ${order.id} to RESERVED (No tasks found)`);
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'RESERVED' }
            });
        } else {
            // Check if session is valid?
            console.log(`Order ${order.id} has ${order.pickingTasks.length} tasks. Leaving as is.`);
        }
    }

    // 2. Clean Empty Sessions
    const emptySessions = await prisma.pickingSession.findMany({
        where: { status: 'IN_PROGRESS', tasks: { none: {} } }
    });

    console.log(`Found ${emptySessions.length} empty IN_PROGRESS sessions.`);
    for (const session of emptySessions) {
        console.log(`Deleting empty session ${session.id}`);
        await prisma.pickingSession.delete({ where: { id: session.id } });
    }

    console.log('--- Done ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
