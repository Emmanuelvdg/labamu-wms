import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data for Picking Strategy Tests...');

    // 1. Clean up existing PENDING orders to ensure clean state
    await prisma.orderItem.deleteMany({ where: { order: { status: 'PENDING' } } });
    await prisma.order.deleteMany({ where: { status: 'PENDING' } });

    // 2. Ensure Product X exists
    let productX = await prisma.product.findFirst({ where: { name: 'Product X' } });
    if (!productX) {
        productX = await prisma.product.create({
            data: {
                sku: 'PROD-X',
                name: 'Product X',
                category: 'Test Category',
                isStockable: true,
                status: 'Active',
                width: 10, height: 10, depth: 10, weight: 1
            }
        });
        console.log('Created Product X');
    }

    // 3. Create Orders for Batch Picking (Customer A vs Customer B)
    // Customer A: 2 Orders
    await prisma.order.create({
        data: {
            customerId: 'Customer A',
            status: 'PENDING',
            priority: 'NORMAL',
            items: {
                create: { productId: productX.id, quantity: 5 }
            }
        }
    });

    await prisma.order.create({
        data: {
            customerId: 'Customer A',
            status: 'PENDING',
            priority: 'NORMAL',
            items: {
                create: { productId: productX.id, quantity: 3 }
            }
        }
    });

    // Customer B: 1 Order
    await prisma.order.create({
        data: {
            customerId: 'Customer B',
            status: 'PENDING',
            priority: 'NORMAL',
            items: {
                create: { productId: productX.id, quantity: 2 }
            }
        }
    });

    // 4. Create additional orders for Cluster Picking (need at least 4 total)
    // We already have 3. Let's add 2 more for different customers.
    await prisma.order.create({
        data: {
            customerId: 'Customer C',
            status: 'PENDING',
            priority: 'NORMAL',
            items: {
                create: { productId: productX.id, quantity: 1 }
            }
        }
    });

    await prisma.order.create({
        data: {
            customerId: 'Customer D',
            status: 'PENDING',
            priority: 'NORMAL',
            items: {
                create: { productId: productX.id, quantity: 1 }
            }
        }
    });

    console.log('Seeding complete. Created 5 PENDING orders.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
