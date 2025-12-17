import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const customer = await prisma.customer.findUnique({
        where: { id: 'cust_001' }
    });
    console.log('Customer:', customer);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
