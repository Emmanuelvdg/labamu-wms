
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Sessions and Tasks ---');

    // 1. Check Active Sessions
    const sessions = await prisma.putawaySession.findMany({
        where: { status: { in: ['PLANNED', 'IN_PROGRESS'] } },
        include: { tasks: true }
    });
    console.log(`\nActive Sessions: ${sessions.length}`);
    sessions.forEach(s => {
        console.log(` - Session ${s.id} (Status: ${s.status}) has ${s.tasks.length} tasks.`);
    });

    // 2. Check Orphaned Tasks (no sessionId) or Tasks not in active session
    const orphanedTasks = await prisma.putawayTask.findMany({
        where: {
            OR: [
                { sessionId: null },
                { sessionId: { isSet: false } as any } // Safe check if optional
            ]
        }
    });

    // Note: Prisma might handle null differently depending on schema.
    // Let's just find ALL pending tasks and see their session IDs.
    const allPending = await prisma.putawayTask.findMany({
        where: { status: 'PENDING' }
    });

    console.log(`\nAll PENDING Tasks: ${allPending.length}`);
    allPending.forEach(t => {
        console.log(` - Task ${t.id} (SKU: LAP-X?) linked to Session: ${t.sessionId || 'NULL'}`);
    });

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
