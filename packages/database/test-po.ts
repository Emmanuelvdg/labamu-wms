import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching first PO...");
    const pos = await prisma.purchaseOrder.findMany();
    if (pos.length === 0) {
        console.log('No purchase orders found in DB.');
        return;
    }
    const po = pos[0];
    console.log('Testing PO ID: ' + po.id);

    try {
        const result = await prisma.purchaseOrder.findUnique({
            where: { id: po.id },
            include: {
                items: { include: { product: true, packaging: true } },
                supplier: true,
                receipts: true
            },
        });
        console.log('Success!', result != null);
    } catch (e) {
        console.error('Error in findUnique:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
