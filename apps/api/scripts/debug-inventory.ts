
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Inventory Levels (Fixed) ---');

    // Added E2E-PROD-2 as well just in case
    const skus = ['E2E-PROD-NEW', 'E2E-PROD-2'];

    for (const sku of skus) {
        console.log(`\nChecking Product: ${sku}`);
        const product = await prisma.product.findFirst({ where: { sku } });

        if (!product) {
            console.log(`Product ${sku} not found.`);
            continue;
        }

        console.log(`Product ID: ${product.id}`);

        const inventory = await prisma.productInventory.findMany({
            where: { productId: product.id }
        });

        if (inventory.length === 0) {
            console.log('No inventory records found.');
        } else {
            inventory.forEach(inv => {
                const available = inv.quantity - inv.reserved;
                console.log(`- WH: ${inv.warehouseId}, Location: ${inv.locationId}, Qty: ${inv.quantity}, Reserved: ${inv.reserved}, Available (Calc): ${available}`);
            });
        }

        // Check Orders for this product
        const orderItems = await prisma.orderItem.findMany({
            where: { productId: product.id },
            include: { order: true }
        });

        if (orderItems.length === 0) {
            console.log('No orders found for this product.');
        } else {
            console.log(`Found ${orderItems.length} order items:`);
            orderItems.forEach(item => {
                console.log(`- Order ID: ${item.order.id}, Status: ${item.order.status}, Qty: ${item.quantity}, WH: ${item.order.warehouseId}`);
            });
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
