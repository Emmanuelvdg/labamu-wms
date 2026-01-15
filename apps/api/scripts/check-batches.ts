
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function checkBatches() {
    const sku = 'E2E-PROD-NEW';
    const product = await prisma.product.findUnique({
        where: { sku },
        include: {
            inventory: true,
            batches: true
        }
    });

    if (!product) {
        console.log(`Product with SKU ${sku} not found.`);
        return;
    }

    console.log(`Product: ${product.name} (${product.id})`);
    console.log('--- Aggregate Inventory ---');
    console.table(product.inventory);
    console.log('--- Inventory Batches ---');
    console.table(product.batches);
}

checkBatches()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
