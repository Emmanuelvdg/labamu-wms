import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst();
    const po = await prisma.purchaseOrder.findFirst();
    console.log(`PO: ${po?.id}`);
    console.log(`USER: ${user?.id}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
