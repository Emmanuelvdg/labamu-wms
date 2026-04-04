const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const sessions = await p.putawaySession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, warehouseId: true, status: true, _count: { select: { tasks: true } } }
    });
    console.log('Recent putaway sessions:', JSON.stringify(sessions, null, 2));
    
    // Also check recent receipts
    const receipts = await p.receipt.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, purchaseOrderId: true, status: true, destinationLocationId: true }
    });
    console.log('Recent receipts:', JSON.stringify(receipts, null, 2));
    
    await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
