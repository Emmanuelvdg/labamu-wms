
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Setting up Mobile Picking Scenario (7.3) ---');

    // 1. Get Product (PRO-LAPTOP-X)
    const product = await prisma.product.findFirst({
        where: { OR: [{ sku: 'PRO-LAPTOP-X' }, { name: { contains: 'Laptop' } }] }
    });

    if (!product) {
        throw new Error('Product PRO-LAPTOP-X not found. Run seed script first?');
    }
    console.log(`Target Product: ${product.sku} (${product.id})`);

    // 2. Get Warehouse
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) throw new Error('No warehouse found');
    console.log(`Target Warehouse: ${warehouse.name}`);

    // 3. Check for existing ALLOCATED orders
    const existing = await prisma.order.findFirst({
        where: {
            warehouseId: warehouse.id,
            fulfillmentStatus: 'ALLOCATED',
            status: { not: 'COMPLETED' }
        }
    });

    if (existing) {
        console.log(`Found existing ALLOCATED order: ${existing.id}. Using it.`);
        return;
    }

    // 4. Create Order
    console.log('Creating new order...');
    const order = await prisma.order.create({
        data: {
            type: 'SALES',
            status: 'CONFIRMED',
            fulfillmentStatus: 'ALLOCATED', // Force allocation state
            warehouseId: warehouse.id,
            customer: {
                connectOrCreate: {
                    where: { email: 'mobile-test@example.com' },
                    create: { name: 'Mobile Test Customer', email: 'mobile-test@example.com' }
                }
            },
            items: {
                create: {
                    productId: product.id,
                    quantity: 1,
                    unitPrice: 1000
                }
            }
        }
    });
    console.log(`Created Order ${order.id}`);

    // 5. Manual Stock Reservation (Since we bypassed the service)
    const inv = await prisma.productInventory.findFirst({
        where: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: { gt: 0 }
        }
    });

    if (inv) {
        await prisma.productInventory.update({
            where: { id: inv.id },
            data: { reserved: { increment: 1 } }
        });
        console.log(`Reserved 1 unit from inventory ${inv.id}`);
    } else {
        console.warn('WARNING: No stock found to reserve! Picking task generation might fail if it checks stock.');
        // Optional: Force add stock?
        // Let's assume stock exists from previous tests (Scenario 8.2).
    }

    console.log('--- Setup Complete ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
