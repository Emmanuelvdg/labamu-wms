import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'UI Test Warehouse 2' }
    });
    console.log('Warehouse:', warehouse);

    const product = await prisma.product.findFirst({
        where: { sku: 'UI-PROD-002' }
    });
    console.log('Product:', product);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
