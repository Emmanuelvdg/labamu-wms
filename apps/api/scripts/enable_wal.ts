import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function enableWal() {
    try {
        console.log('🔧 Enabling WAL mode for SQLite...');
        const result = await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
        console.log('✅ Journal mode set to:', result);

        // Also increase busy_timeout to wait longer for locks
        await prisma.$queryRaw`PRAGMA busy_timeout = 5000;`;
        console.log('✅ Busy timeout set to 5000ms');

    } catch (error) {
        console.error('❌ Error enabling WAL:', error);
    } finally {
        await prisma.$disconnect();
    }
}

enableWal();
