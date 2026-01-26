
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Executing Putaway Manual ---');

    // 1. Find Product
    const product = await prisma.product.findUnique({
        where: { sku: 'LAP-X' }
    });
    if (!product) throw new Error('Product LAP-X not found');

    // 2. Find Source and Destination
    const dock = await prisma.location.findFirst({
        where: { name: 'Receiving Dock 1' }
    });
    const bin = await prisma.location.findFirst({
        where: { name: 'Bin 01' }
    });

    if (!dock || !bin) throw new Error('Locations not found');
    console.log(`Source: ${dock.name}, Dest: ${bin.name}`);

    // 3. Find Pending Putaway Task
    let task = await prisma.putawayTask.findFirst({
        where: {
            productId: product.id,
            status: 'PENDING',
            sourceLocationId: dock.id
        }
    });

    if (task) {
        console.log(`Found Pending Task: ${task.id} (Qty: ${task.quantity})`);
    } else {
        console.log('No pending task found. Creating one for record keeping...');
        // Create a task if one doesn't exist, to simulate the process
        task = await prisma.putawayTask.create({
            data: {
                productId: product.id,
                sourceLocationId: dock.id,
                destinationLocationId: bin.id,
                quantity: 10,
                status: 'PENDING',
                putawayQuantity: 0
            }
        });
        console.log(`Created Task: ${task.id}`);
    }

    // 4. Execute the Move (Transaction)
    console.log('Executing Move...');

    // a. Decrement from Dock
    await prisma.productInventory.updateMany({
        where: {
            productId: product.id,
            locationId: dock.id
        },
        data: {
            quantity: { decrement: 10 }
        }
    });

    // b. Increment at Bin (Upsert logic simplified)
    const existingStock = await prisma.productInventory.findFirst({
        where: { productId: product.id, locationId: bin.id }
    });

    if (existingStock) {
        await prisma.productInventory.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: 10 } }
        });
    } else {
        // Find warehouse for the bin
        const warehouse = await prisma.warehouse.findFirst(); // Default to first for now
        if (!warehouse) throw new Error('No warehouse found');

        await prisma.productInventory.create({
            data: {
                productId: product.id,
                locationId: bin.id,
                warehouseId: warehouse.id,
                quantity: 10
            }
        });
    }

    // 5. Update Task Status
    await prisma.putawayTask.update({
        where: { id: task.id },
        data: {
            status: 'COMPLETED',
            putawayQuantity: 10,
            destinationLocationId: bin.id // Ensure it matches where we put it
        }
    });

    console.log('Putaway Task Completed.');

    // 6. Log Transaction
    await prisma.stockTransaction.create({
        data: {
            productId: product.id,
            type: 'MOVE',
            quantity: 10,
            referenceId: task.id
        }
    });

    console.log('Transaction logged.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
