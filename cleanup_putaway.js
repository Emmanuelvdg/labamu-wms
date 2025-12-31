const { PrismaClient } = require('@labamu/database');

async function cleanupPutaway() {
    const prisma = new PrismaClient();

    try {
        console.log('🧹 Cleaning up old putaway data...');

        // Delete all putaway tasks first (foreign key constraint)
        const deletedTasks = await prisma.$executeRaw`DELETE FROM "PutawayTask"`;
        console.log(`✅ Deleted ${deletedTasks} putaway tasks`);

        // Delete all putaway sessions
        const deletedSessions = await prisma.$executeRaw`DELETE FROM "PutawaySession"`;
        console.log(`✅ Deleted ${deletedSessions} putaway sessions`);

        console.log('✨ Cleanup complete! Now you can create fresh putaway tasks.');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupPutaway();
