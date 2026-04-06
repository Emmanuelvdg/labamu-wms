import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const po = await prisma.purchaseOrder.findFirst({
        include: { items: true, supplier: true }
    });
    const warehouse = await prisma.warehouse.findFirst({
        include: { viewLocation: true }
    });
    
    console.log('PO:', JSON.stringify(po, null, 2));
    console.log('Warehouse:', JSON.stringify(warehouse, null, 2));
}

main();
