const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function main() {
    const bins = await prisma.location.findMany({
        where: { structuralType: 'BIN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
    console.log(JSON.stringify(bins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
