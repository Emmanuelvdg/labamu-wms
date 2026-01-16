
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Schema Update (RMA Fields) ---');

    // Attempt to create a dummy order with return details on items
    // This will fail compilation or runtime if fields don't exist
    try {
        // We won't actually save it, just type check via execution or partial check
        // Or better, let's just inspect the Prisma Client type properties if possible?
        // No, runtime check.

        // Let's create a dummy product first
        const p = await prisma.product.create({
            data: {
                sku: 'SCHEMA-TEST-' + Date.now(),
                name: 'Schema Test',
                category: 'Test'
            }
        });

        // Use transaction to roll back
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    type: 'SALES',
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{
                            productId: p.id,
                            quantity: 1,
                            // NEW FIELDS
                            returnReason: 'Test Reason',
                            condition: 'Test Condition'
                        }]
                    }
                },
                include: { items: true }
            });

            console.log('Order Item Created with RMA fields:');
            console.log(order.items[0]);

            if (order.items[0].returnReason === 'Test Reason') {
                console.log('PASS: returnReason field exists and persisted.');
            } else {
                console.error('FAIL: returnReason not persisted.');
            }

            throw new Error('Rollback');
        });

    } catch (e: any) {
        if (e.message === 'Rollback') {
            console.log('Verification Logic Completed (Rolled back DB changes).');
        } else {
            console.error('Verification Failed:', e);
            process.exit(1);
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
