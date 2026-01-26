
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Purchase Orders ---');

    const po = await prisma.purchaseOrder.findFirst({
        where: {
            supplier: { name: 'TechSupplier Inc' }
        },
        include: {
            supplier: true,
            items: {
                include: { product: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (po) {
        console.log(`Found PO: ${po.poNumber} (${po.id})`);
        console.log(`Status: ${po.status}`);
        console.log(`Supplier: ${po.supplier.name}`);
        console.log(`Items: ${po.items.length}`);
        po.items.forEach(item => {
            console.log(`- ${item.product.name} (Qty: ${item.quantity})`);
        });
    } else {
        console.log('No matching DRAFT PO found.');
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
