import { PrismaClient } from '../../../packages/database/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Lalamove delivery method...');

    // Check if Lalamove delivery method already exists
    const existing = await prisma.deliveryMethod.findFirst({
        where: {
            provider: 'LALAMOVE',
            carrier: 'Lalamove'
        }
    });

    if (existing) {
        console.log('Lalamove delivery method already exists:', existing.id);
        return;
    }

    // Create Lalamove delivery method
    const lalamoveMethod = await prisma.deliveryMethod.create({
        data: {
            name: 'Lalamove Delivery',
            provider: 'LALAMOVE',
            carrier: 'Lalamove',
            fixedPrice: 0, // Dynamic pricing via API
            active: true,
        }
    });

    console.log('✓ Lalamove delivery method seeded successfully:', lalamoveMethod.id);
}

main()
    .catch((e) => {
        console.error('Error seeding Lalamove delivery method:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
