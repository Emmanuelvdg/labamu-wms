
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function verifySeededData() {
    console.log('Verifying SHIPPED orders...');

    // Check total count
    const totalCount = await prisma.order.count({
        where: { status: 'SHIPPED' }
    });
    console.log(`Total SHIPPED orders: ${totalCount}`);

    // Check orders in last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 35); // Check slightly wider range

    const recentCount = await prisma.order.count({
        where: {
            status: 'SHIPPED',
            updatedAt: {
                gte: startDate,
                lte: endDate
            }
        }
    });
    console.log(`SHIPPED orders in last 35 days: ${recentCount}`);

    // Inspect a few
    const samples = await prisma.order.findMany({
        where: {
            status: 'SHIPPED',
            updatedAt: { gte: startDate }
        },
        take: 3,
        select: { id: true, createdAt: true, updatedAt: true }
    });

    console.log('Sample orders:');
    samples.forEach(s => {
        console.log(`ID: ${s.id}, Created: ${s.createdAt.toISOString()}, Updated: ${s.updatedAt.toISOString()}`);
    });
}

verifySeededData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
