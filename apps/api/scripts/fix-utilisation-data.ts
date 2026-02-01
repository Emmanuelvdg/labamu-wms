export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Utilisation Data Fix...');

    // 1. Fix Locations in Distribution Center 1
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (warehouse) {
        console.log(`Updating locations for warehouse: ${warehouse.name}`);
        const updateLocs = await prisma.location.updateMany({
            where: {
                warehouseId: warehouse.id,
                maxVolume: null
            },
            data: {
                maxVolume: 100, // 100 m3
                maxWeight: 5000 // 5000 kg
            }
        });
        console.log(`Updated ${updateLocs.count} locations with default capacity.`);
    } else {
        console.warn('Distribution Center 1 not found, skipping location update.');
    }

    // 2. Fix Products with missing dimensions
    console.log('Updating products with missing dimensions...');

    // Prisma updateMany for products where dimensions are null
    // Note: checking for 0 or null is tricky in bulk update if we want to be specific, 
    // but here we just want to ensure everything has *some* volume.
    const updateProds = await prisma.product.updateMany({
        where: {
            OR: [
                { width: null },
                { width: 0 },
                { height: null },
                { height: 0 },
                { depth: null },
                { depth: 0 }
            ]
        },
        data: {
            width: 20,  // cm
            height: 20, // cm
            depth: 20,  // cm
            weight: 1   // kg
        }
    });

    console.log(`Updated ${updateProds.count} products with default dimensions (20x20x20cm).`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
