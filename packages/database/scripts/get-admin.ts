import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAdminId() {
    const admin = await prisma.user.findFirst({
        where: { email: 'admin@labamu.co.id' }
    });
    console.log(`Admin ID: ${admin?.id}`);
}

getAdminId()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
