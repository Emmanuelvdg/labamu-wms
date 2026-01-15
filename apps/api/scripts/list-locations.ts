
import { PrismaClient, LocationType } from '@labamu/database';

const prisma = new PrismaClient();

async function listLocations() {
    const warehouseId = 'a076b96b-868c-49a9-bbd1-c54d4470f419'; // E2E Warehouse
    const locations = await prisma.location.findMany({
        where: { warehouseId },
        select: { id: true, name: true, type: true, structuralType: true }
    });

    console.table(locations);

    // Also checking for any functional areas
    const areas = await prisma.warehouseFunctionalArea.findMany({
        where: { warehouseId }
    });
    console.log('Functional Areas:', areas.length);
    console.table(areas);
}

listLocations()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
