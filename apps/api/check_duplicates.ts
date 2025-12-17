import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const warehouses = await prisma.warehouse.findMany({
        select: { id: true, name: true }
    });

    const nameCounts: { [key: string]: number } = {};
    warehouses.forEach(w => {
        nameCounts[w.name] = (nameCounts[w.name] || 0) + 1;
    });

    console.log('--- Duplicate Warehouses ---');
    for (const [name, count] of Object.entries(nameCounts)) {
        if (count > 1) {
            console.log(`Name: "${name}", Count: ${count}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
