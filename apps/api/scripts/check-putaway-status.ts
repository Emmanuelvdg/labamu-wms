
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Stock and Moves for Putaway ---');

    // 1. Check Stock at Receiving Dock 1
    const dock = await prisma.location.findFirst({
        where: { name: 'Receiving Dock 1' },
        include: { inventory: { include: { product: true } } }
    });

    if (dock) {
        console.log(`\nLocation: ${dock.name} (${dock.id})`);
        dock.inventory.forEach(s => {
            console.log(` - Product: ${s.product.name} (SKU: ${s.product.sku}) | Qty: ${s.quantity}`);
        });
    } else {
        console.log('\nReceiving Dock 1 not found!');
    }

    // 2. Check Target Bin 01
    const bin = await prisma.location.findFirst({
        where: { name: 'Bin 01' },
        include: { inventory: { include: { product: true } } }
    });

    if (bin) {
        console.log(`\nLocation: ${bin.name} (${bin.id})`);
        bin.inventory.forEach(s => {
            console.log(` - Product: ${s.product.name} (SKU: ${s.product.sku}) | Qty: ${s.quantity}`);
        });
    } else {
        console.log('\nBin 01 not found!');
    }

    // 3. Check for Pending Putaway Tasks
    const tasks = await prisma.putawayTask.findMany({
        where: {
            status: 'PENDING',
            product: { sku: 'LAP-X' }
        },
        include: {
            sourceLocation: true,
            destinationLocation: true,
            product: true
        }
    });

    if (tasks.length > 0) {
        console.log(`\nFound ${tasks.length} Pending Tasks for LAP-X:`);
        tasks.forEach(t => {
            console.log(` - Task ID: ${t.id} | Qty: ${t.quantity} | From: ${t.sourceLocation?.name} -> To: ${t.destinationLocation?.name}`);
        });
    } else {
        console.log('\nNo PENDING putaway tasks found for LAP-X.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
