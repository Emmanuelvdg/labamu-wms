const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const po = await prisma.purchaseOrder.findFirst({
        include: { items: true, supplier: true }
    });
    const warehouse = await prisma.warehouse.findFirst({
        include: { viewLocation: { select: { id: true } } }
    });
    
    console.log('PO:', JSON.stringify(po, null, 2));
    console.log('Warehouse:', JSON.stringify(warehouse, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
