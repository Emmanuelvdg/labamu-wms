import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
    const admin = await prisma.user.findFirst({
        where: { email: 'admin@labamu.co.id' },
        include: { role: { include: { permissions: true } } }
    });

    console.log(JSON.stringify(admin?.role?.permissions, null, 2));
}

checkAdminPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
