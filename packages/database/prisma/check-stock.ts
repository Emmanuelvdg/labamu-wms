
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const orderId = 'deae9245-195f-417e-81e4-ec99c7b540ad'; // Full UUID

    // 1. Get the order to find items
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
    });

    if (!order) {
        console.log(`Order ${orderId} not found`);
        return;
    }

    console.log(`Order Status: ${order.status}`);

    // 2. Check reservations for the items
    for (const item of order.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        console.log(`Checking Product: ${product?.name} (${item.productId})`);

        const inventory = await prisma.productInventory.findMany({
            where: { productId: item.productId }
        });

        console.log('Inventory Records:', JSON.stringify(inventory, null, 2));

        const totalReserved = inventory.reduce((sum, inv) => sum + inv.reserved, 0);
        console.log(`Total Reserved in DB: ${totalReserved}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
