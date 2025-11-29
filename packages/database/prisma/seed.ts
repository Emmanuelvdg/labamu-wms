import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed Picking Strategies
    const pickingStrategies = [
        { name: 'Single', rules: JSON.stringify({ description: 'Process one order at a time' }) },
        { name: 'Cluster', rules: JSON.stringify({ description: 'Group orders by zone' }) },
        { name: 'Wave', rules: JSON.stringify({ description: 'Collect orders in scheduled waves' }) },
        { name: 'Batch', rules: JSON.stringify({ description: 'Pick multiple orders simultaneously' }) },
    ];

    for (const strategy of pickingStrategies) {
        await prisma.pickingStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }

    // Seed Reservation Strategies
    const reservationStrategies = [
        { name: 'FIFO', rules: JSON.stringify({ description: 'First In, First Out' }) },
        { name: 'FEFO', rules: JSON.stringify({ description: 'First Expiry, First Out' }) },
        { name: 'Location', rules: JSON.stringify({ description: 'Prioritize specific warehouses' }) },
    ];

    for (const strategy of reservationStrategies) {
        await prisma.reservationStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
