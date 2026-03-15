import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Warehouses:');
    console.log(await prisma.warehouse.findMany({
        select: { id: true, name: true }
    }));
    console.log('\nLocations:');
    console.log(await prisma.location.findMany({
        select: { id: true, name: true, type: true, structuralType: true, code: true }
    }));
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
