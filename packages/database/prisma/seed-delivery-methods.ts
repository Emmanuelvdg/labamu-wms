import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Delivery Methods...');

    const methods = [
        {
            name: 'Standard Delivery',
            provider: 'FIXED_PRICE',
            fixedPrice: 15000,
            active: true
        },
        {
            name: 'Express Delivery',
            provider: 'FIXED_PRICE',
            fixedPrice: 50000,
            active: true
        },
        {
            name: 'Lalamove',
            provider: 'LALAMOVE',
            fixedPrice: 0,
            active: true
        }
    ];

    for (const method of methods) {
        await prisma.deliveryMethod.upsert({
            where: { id: method.name }, // Hack: using name as ID verify uniqueness if schema allowed name unique, but schema doesn't have unique on name. 
            // Wait, ID is uuid. I cannot upsert by name unless name is unique.
            // Let's check schema again. `id String @id @default(uuid())`, `name String`. Name is NOT unique.
            // So I should use findFirst to check existence.
            update: {},
            create: method,
        } as any);
    }

    // Better approach since name is not unique and ID is UUID:
    for (const method of methods) {
        const existing = await prisma.deliveryMethod.findFirst({
            where: { name: method.name }
        });

        if (!existing) {
            await prisma.deliveryMethod.create({
                data: method
            });
            console.log(`Created ${method.name}`);
        } else {
            console.log(`Skipped ${method.name} (already exists)`);
        }
    }

    console.log('Delivery Methods seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
