import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({
        where: { sku: 'UI-PROD-002' },
        select: { id: true }
    });
    console.log('PID:' + product?.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
