export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for Bin-02...');

    const bin02 = await prisma.location.findFirst({
        where: { name: { contains: 'Bin 02' } }, // Try fuzzy search first
        include: { parent: true }
    });

    // Try exact if fuzzy fails or just print what we found
    if (bin02) {
        console.log(`Found Location: ${bin02.name} (ID: ${bin02.id})`);
        console.log(`  Type: ${bin02.type}`);
        console.log(`  Structural Type: ${bin02.structuralType}`);
        console.log(`  Parent: ${bin02.parent?.name}`);
        console.log(`  Warehouse ID: ${bin02.warehouseId}`);
    } else {
        const bin02Exact = await prisma.location.findFirst({
            where: { name: 'Bin-02' }
        });
        if (bin02Exact) {
            console.log(`Found Location (Exact match): ${bin02Exact.name}`);
            console.log(`  Warehouse ID: ${bin02Exact.warehouseId}`);
        } else {
            console.log('Location "Bin-02" (or "Bin 02") NOT FOUND in database.');
        }
    }

    // Also list all locations in Distribution Center 1 for context
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });
    if (warehouse) {
        const locs = await prisma.location.findMany({
            where: { warehouseId: warehouse.id },
            select: { name: true, type: true }
        });
        console.log(`\nAll Locations in DC 1 (${locs.length}):`);
        locs.forEach(l => console.log(` - ${l.name} (${l.type})`));
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
