const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    try {
        const warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            console.log('No warehouse found');
            return;
        }

        console.log(`Warehouse: ${warehouse.name} (${warehouse.id})`);

        // 1. Find if there are reserved orders
        const orders = await prisma.order.findMany({
            where: { status: 'RESERVED' },
            take: 5
        });

        console.log(`Found ${orders.length} reserved orders`);

        if (orders.length === 0) {
            // Create a dummy order if needed, but let's just check if a session exists
            const activeSession = await prisma.pickingSession.findFirst({
                where: { status: 'IN_PROGRESS' },
                include: { tasks: true }
            });
            console.log('Active session:', activeSession ? 'Yes' : 'No');
            if (activeSession) {
                console.log('Tasks in active session:', activeSession.tasks.length);
            }
            return;
        }

        // 2. Test createWavelessSession logic (simulated or via API)
        // Since I want to test the actual service, I'll just check the code again.
        // Or I can trigger the API if the server is running.

        console.log('Testing createWavelessSession output format...');
        // We'll check if the DB has tasks for any IN_PROGRESS sessions
        const sessions = await prisma.pickingSession.findMany({
            where: { status: 'IN_PROGRESS' },
            include: { tasks: true }
        });

        for (const s of sessions) {
            console.log(`Session ${s.id} (${s.strategy}): ${s.tasks.length} tasks`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
