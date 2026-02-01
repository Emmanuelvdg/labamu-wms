export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Utilisation Data...');

    // 1. Find Distribution Center 1
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (!warehouse) {
        console.error('Warehouse "Distribution Center 1" not found');
        return;
    }
    console.log(`Warehouse found: ${warehouse.name} (${warehouse.id})`);

    // 2. Check Locations
    const locations = await prisma.location.findMany({
        where: { warehouseId: warehouse.id },
        include: { inventory: { include: { product: true } } }
    });

    console.log(`Found ${locations.length} locations`);

    let totalInventoryItems = 0;
    let productsWithNoDimensions = 0;
    let locationsWithNoCapacity = 0;

    for (const loc of locations) {
        const hasLegacyCapacity = (loc.maxVolume && loc.maxVolume > 0) || (loc.maxWeight && loc.maxWeight > 0);
        const hasDimensions = (loc.innerLength && loc.innerWidth && loc.innerHeight);

        if (!hasLegacyCapacity && !hasDimensions) {
            locationsWithNoCapacity++;
            // console.log(`Location ${loc.name} has NO CAPACITY defined.`);
        }

        if (loc.inventory.length > 0) {
            totalInventoryItems += loc.inventory.length;
            for (const item of loc.inventory) {
                const prod = item.product;
                const hasProdDims = (prod.width && prod.height && prod.depth);
                if (!hasProdDims) {
                    productsWithNoDimensions++;
                    // console.log(`Product ${prod.name} in ${loc.name} has NO DIMENSIONS.`);
                }
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Locations with NO Capacity Defined: ${locationsWithNoCapacity} / ${locations.length}`);
    console.log(`Total Inventory Batches: ${totalInventoryItems}`);
    console.log(`Products with NO Dimensions: ${productsWithNoDimensions}`);

    // Detail sample if meaningful
    if (locations.length > 0) {
        console.log('Sample Location:', locations[0].name);
        console.log('  maxVolume:', locations[0].maxVolume);
        console.log('  maxWeight:', locations[0].maxWeight);
        console.log('  Dimensions (L,W,H):', locations[0].innerLength, locations[0].innerWidth, locations[0].innerHeight);
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
