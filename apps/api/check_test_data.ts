import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking UI Test Data ---');

    const product = await prisma.product.findFirst({
        where: { sku: 'UI-PROD-001' }
    });
    console.log('Product "UI-PROD-001":', product ? 'FOUND' : 'NOT FOUND');
    if (product) console.log(product);

    const customer = await prisma.customer.findFirst({
        where: { name: 'UI Customer' }
    });
    console.log('Customer "UI Customer":', customer ? 'FOUND' : 'NOT FOUND');
    if (customer) console.log(customer);

    process.exit(0);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
