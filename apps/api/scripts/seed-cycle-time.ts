
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function seedCycleTimeData() {
    console.log('Seeding cycle time data...');

    // Clean up old test data if needed? No, append is safer.

    // Generate orders for the last 30 days
    const now = new Date();

    for (let i = 0; i < 30; i++) {
        // 1-3 orders per day
        const ordersToday = randomInt(1, 4);

        for (let j = 0; j < ordersToday; j++) {
            const daysAgo = 30 - i;
            const shippedDate = new Date(now);
            shippedDate.setDate(shippedDate.getDate() - daysAgo);
            shippedDate.setHours(randomInt(9, 17), randomInt(0, 59));

            // Cycle time between 4 hours and 48 hours
            const cycleHours = randomInt(4, 48);
            const createdDate = new Date(shippedDate);
            createdDate.setHours(createdDate.getHours() - cycleHours);

            await prisma.order.create({
                data: {
                    id: `CT-TEST-${daysAgo}-${j}`,
                    type: 'SALES',
                    status: 'SHIPPED',
                    priority: 'NORMAL',
                    createdAt: createdDate,
                    updatedAt: shippedDate,
                    customer: {
                        create: {
                            name: 'Test Customer'
                        }
                    }
                }
            });
        }
    }

    console.log('Seeding complete.');
}

seedCycleTimeData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
