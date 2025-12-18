
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('Users in database:', users);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
