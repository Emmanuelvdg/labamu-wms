
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing E2E Stock Location (Simulating Putaway) ---');

    // 1. Find Warehouse
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'E2E Warehouse' }
    });

    if (!warehouse) {
        console.error('ERROR: E2E Warehouse not found. Run seed scripts first.');
        return;
    }
    console.log(`Found Warehouse: ${warehouse.name} (${warehouse.id})`);

    // 2. Find Product
    const sku = 'E2E-PROD-NEW';
    const product = await prisma.product.findFirst({ where: { sku } });

    if (!product) {
        console.error(`ERROR: Product ${sku} not found.`);
        return;
    }
    console.log(`Found Product: ${sku} (${product.id})`);

    // 3. Find a Valid Storage Location (Simulate putting away to 'Zone A' or 'Row 1' or fallback to 'Stock')
    // We prefer a location that is NOT the root view.
    let targetLocation = await prisma.location.findFirst({
        where: {
            warehouseId: warehouse.id,
            type: 'INTERNAL',
            name: { contains: 'Zone A' } // Ideal target
        }
    });

    if (!targetLocation) {
        console.log('Zone A not found, looking for generic Stock location...');
        targetLocation = await prisma.location.findFirst({
            where: {
                warehouseId: warehouse.id,
                type: 'INTERNAL',
                name: 'Stock'
            }
        });
    }

    if (!targetLocation) {
        // Fallback to ANY internal location that isn't the view
        targetLocation = await prisma.location.findFirst({
            where: {
                warehouseId: warehouse.id,
                type: 'INTERNAL'
            }
        });
    }

    if (!targetLocation) {
        console.error('ERROR: No valid INTERNAL storage location found in E2E Warehouse.');
        return;
    }

    console.log(`Target Putaway Location: ${targetLocation.name} (${targetLocation.id})`);

    // 4. Update Inventory Batches (The critical part for Picking)
    const updateBatches = await prisma.inventoryBatch.updateMany({
        where: {
            productId: product.id,
            warehouseId: warehouse.id,
            locationId: null // Only fix those stuck in receiving/null
        },
        data: {
            locationId: targetLocation.id
        }
    });

    console.log(`Updated ${updateBatches.count} inventory batches to location ${targetLocation.name}`);

    // 5. Update ProductInventory (Aggregate)
    // We need to be careful here. If a ProductInventory record already exists for this target location,
    // we should merge. If not, we update the existing null-location record.

    // Find the 'null location' inventory
    const nullInventory = await prisma.productInventory.findFirst({
        where: {
            productId: product.id,
            warehouseId: warehouse.id,
            locationId: null
        }
    });

    if (nullInventory) {
        // Check if target location already has an inventory record
        const targetInventory = await prisma.productInventory.findFirst({
            where: {
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: targetLocation.id
            }
        });

        if (targetInventory) {
            // MERGE: Add quantities to target and delete null record
            console.log(`Merging ${nullInventory.quantity} units into existing inventory at ${targetLocation.name}`);
            await prisma.productInventory.update({
                where: { id: targetInventory.id },
                data: {
                    quantity: { increment: nullInventory.quantity },
                    reserved: { increment: nullInventory.reserved } // Move reservation count too if any
                }
            });
            await prisma.productInventory.delete({ where: { id: nullInventory.id } });
        } else {
            // MOVE: Just update the locationId
            console.log(`Moving inventory record to ${targetLocation.name}`);
            await prisma.productInventory.update({
                where: { id: nullInventory.id },
                data: { locationId: targetLocation.id }
            });
        }
    } else {
        console.log('No orphaned ProductInventory record found (location: null).');
    }

    console.log('--- Fix Complete ---');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
