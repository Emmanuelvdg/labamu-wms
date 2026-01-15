
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    const warehouses = await prisma.warehouse.findMany();
    console.table(warehouses.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type
    })));
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
