
const { PrismaClient } = require('@prisma/client');
// If that fails, try standard require if node resolution works from workspace

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db'
        }
    }
});

async function main() {
    console.log('--- Verifying Real Logic Queries (Direct DB) ---');

    // 1. Test Daily Sales Trend Logic
    console.log('Testing Daily Sales Trend Query...');
    const dailyOrderCounts = [];
    const today = new Date();

    for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const startOfDay = new Date(d.setHours(0, 0, 0, 0));
        const endOfDay = new Date(d.setHours(23, 59, 59, 999));

        const dailyCount = await prisma.order.count({
            where: {
                status: 'SHIPPED',
                updatedAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
        dailyOrderCounts.push(dailyCount);
    }
    console.log('✅ Daily Sales (Last 5 days):', dailyOrderCounts);

    // 2. Test Compliance Report Logic (VAT)
    console.log('\nTesting VAT Report Query Logic...');
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const shippedOrders = await prisma.order.findMany({
        take: 5,
        where: {
            status: 'SHIPPED',
            updatedAt: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        },
        include: {
            items: {
                include: { product: true }
            }
        }
    });

    let totalSalesBase = 0;
    for (const order of shippedOrders) {
        for (const item of order.items) {
            totalSalesBase += (item.quantity * item.product.averageCost);
        }
    }
    const totalVAT = totalSalesBase * 0.11;
    console.log(`✅ VAT Calculation Check: Found ${shippedOrders.length} shipped orders. Total Base: ${totalSalesBase}, VAT: ${totalVAT}`);

    // 3. Test SAF-T Logic
    const transactions = await prisma.stockTransaction.findMany({
        where: {
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        },
        include: { product: true },
        take: 5
    });
    console.log(`✅ SAF-T Check: Found ${transactions.length} stock transactions.`);
}

main()
    .catch(e => {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
