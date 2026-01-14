
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStock() {
    const sku = 'E2E-PROD-NEW';
    const product = await prisma.product.findUnique({
        where: { sku },
        include: {
            inventory: true
        }
    });

    if (!product) {
        console.log(`Product with SKU ${sku} not found.`);
    } else {
        console.log(`Product found: ${product.name} (${product.id})`);
        console.log('Inventory levels:', product.inventory);
    }
}

checkStock()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
