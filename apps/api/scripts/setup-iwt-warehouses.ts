
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function setup() {
    console.log('--- Setting up IWT Warehouses ---');

    // 1. Main Warehouse
    let mainWarehouse = await prisma.warehouse.findFirst({
        where: { name: 'Main Warehouse' }
    });

    if (!mainWarehouse) {
        console.log('Creating Main Warehouse...');
        mainWarehouse = await prisma.warehouse.create({
            data: {
                name: 'Main Warehouse',
                address: '123 Main St, Central City',
                type: 'PHYSICAL'
            }
        });
        console.log(`Created Main Warehouse: ${mainWarehouse.id}`);
    } else {
        console.log(`Main Warehouse exists: ${mainWarehouse.id}`);
    }

    // 2. Receiving Location in Main Warehouse
    let receivingLoc = await prisma.location.findFirst({
        where: {
            warehouseId: mainWarehouse.id,
            name: 'Receiving Dock'
        }
    });

    if (!receivingLoc) {
        console.log('Creating Receiving Dock for Main Warehouse...');
        await prisma.location.create({
            data: {
                name: 'Receiving Dock',
                warehouseId: mainWarehouse.id,
                type: 'INTERNAL'
            }
        });
        console.log('Created Receiving Dock');
    } else {
        console.log('Receiving Dock exists');
    }

    // 3. E2E Warehouse Check
    const e2eWarehouse = await prisma.warehouse.findFirst({
        where: { name: 'E2E Warehouse' }
    });

    if (e2eWarehouse) {
        console.log(`E2E Warehouse check: Found (${e2eWarehouse.id})`);

        // Check stock
        const stock = await prisma.productInventory.findFirst({
            where: {
                warehouseId: e2eWarehouse.id,
                product: { sku: 'E2E-PROD-NEW' }
            }
        });
        console.log(`E2E Product Stock: ${stock?.quantity || 0} (Reserved: ${stock?.reserved || 0})`);
    } else {
        console.warn('WARNING: E2E Warehouse not found!');
    }
}

setup()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
