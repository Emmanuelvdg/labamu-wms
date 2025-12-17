import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const locations = await prisma.location.findMany({
        where: { name: { contains: 'Cold Storage' } }
    });
    console.log('Found locations:', locations);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
