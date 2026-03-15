import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Categories:');
    console.log(await prisma.category.findMany({ select: { id: true, name: true } }));
    console.log('\nProducts:');
    console.log(await prisma.product.findMany({ select: { id: true, name: true, sku: true } }));
    console.log('\nSuppliers:');
    console.log(await prisma.supplier.findMany({ select: { id: true, name: true } }));
    console.log('\nPurchase Orders:');
    console.log(await prisma.purchaseOrder.findMany({ select: { id: true, poNumber: true, status: true, supplierId: true } }));
    console.log('\nInventory Items (Stock):');
    const items = await prisma.productInventory.findMany({
        select: { id: true, quantity: true, location: { select: { name: true, type: true } }, product: { select: { name: true } } }
    });
    console.log(JSON.stringify(items, null, 2));
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
