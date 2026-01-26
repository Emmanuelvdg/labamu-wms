
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Resetting Scenario 3.4 (Putaway) ---');

    // 1. Find Product
    const product = await prisma.product.findUnique({ where: { sku: 'LAP-X' } });
    if (!product) throw new Error('Product LAP-X not found');

    // 2. Find Locations
    const dock = await prisma.location.findFirst({ where: { name: 'Receiving Dock 1' } });
    const bin = await prisma.location.findFirst({ where: { name: 'Bin 01' } });
    if (!dock || !bin) throw new Error('Locations not found');

    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) throw new Error('Warehouse not found');

    // 3. Reset Stock: Ensure 10 at Dock, 0 at Bin
    console.log('Resetting stock...');
    await prisma.productInventory.deleteMany({
        where: {
            productId: product.id,
            locationId: { in: [dock.id, bin.id] }
        }
    });

    // Add 10 to Dock
    await prisma.productInventory.create({
        data: {
            productId: product.id,
            locationId: dock.id,
            warehouseId: warehouse.id,
            quantity: 10
        }
    });
    console.log('Stock set: 10 at Receiving Dock 1.');

    // 4. Reset Putaway Task & Session
    console.log('Resetting tasks...');
    await prisma.putawayTask.deleteMany({
        where: { productId: product.id }
    });

    // Find or Create Active Session
    let session = await prisma.putawaySession.findFirst({
        where: {
            warehouseId: warehouse.id,
            status: { in: ['PLANNED', 'IN_PROGRESS'] }
        }
    });

    if (!session) {
        console.log('Creating new active session...');
        session = await prisma.putawaySession.create({
            data: {
                warehouseId: warehouse.id,
                status: 'PLANNED'
            }
        });
    } else {
        console.log(`Using existing active session: ${session.id}`);
    }

    // Create a PENDING task LINKED TO SESSION
    const task = await prisma.putawayTask.create({
        data: {
            sessionId: session.id, // <--- CRITICAL FIX
            productId: product.id,
            sourceLocationId: dock.id,
            destinationLocationId: bin.id,
            quantity: 10,
            status: 'PENDING',
            putawayQuantity: 0
        }
    });

    console.log(`Created PENDING Putaway Task: ${task.id} (Linked to Session: ${session.id})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
