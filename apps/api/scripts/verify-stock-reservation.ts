
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Stock Reservation Details (Scenario 4.4) ---');

    const sku = 'E2E-PROD-NEW';
    const product = await prisma.product.findFirst({ where: { sku } });

    if (!product) {
        console.log(`Product ${sku} not found.`);
        return;
    }

    console.log(`Checking Product: ${sku} (${product.id})`);

    const inventory = await prisma.productInventory.findMany({
        where: { productId: product.id }
    });

    if (inventory.length === 0) {
        console.log('No inventory records found.');
        return;
    }

    let totalReserved = 0;
    inventory.forEach(inv => {
        console.log(`- WH: ${inv.warehouseId}, Qty: ${inv.quantity}, Reserved: ${inv.reserved}`);
        totalReserved += inv.reserved;
    });

    if (totalReserved > 0) {
        console.log(`PASS: Total Reserved Quantity is ${totalReserved}`);
    } else {
        console.warn('WARNING: No reserved stock found. Ensure an order is in RESERVED status.');

        // Detailed check: Any RESERVED orders for this product?
        const orders = await prisma.order.findMany({
            where: {
                status: 'RESERVED',
                items: { some: { productId: product.id } }
            }
        });
        console.log(`Found ${orders.length} RESERVED orders for this product.`);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
