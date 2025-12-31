import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Supplier Management Test...');

    // 1. Create Supplier
    console.log('1. Creating Supplier...');
    const supplier = await prisma.supplier.create({
        data: {
            name: 'Test Supplier ' + Date.now(),
            contactInfo: 'test@supplier.com',
        },
    });
    console.log('Supplier created:', supplier);

    // 2. Create Product
    console.log('2. Creating Product...');
    const product = await prisma.product.create({
        data: {
            name: 'Test Product ' + Date.now(),
            sku: 'TP-' + Date.now(),
            description: 'Test Product Description',
            price: 100,
            cost: 50,
            stock: 0,
        },
    });
    console.log('Product created:', product);

    // 3. Create Purchase Order
    console.log('3. Creating Purchase Order...');
    const po = await prisma.purchaseOrder.create({
        data: {
            supplierId: supplier.id,
            status: 'DRAFT',
            totalAmount: 500,
            items: {
                create: {
                    productId: product.id,
                    quantity: 10,
                    unitPrice: 50,
                },
            },
        },
    });
    console.log('Purchase Order created:', po);

    // 4. Update PO to CONFIRMED and RECEIVED to simulate history
    console.log('4. Updating PO status...');
    await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'CONFIRMED' },
    });
    await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'RECEIVED' },
    });
    console.log('PO status updated to RECEIVED');

    // 5. Verify Supplier Stats
    console.log('5. Verifying Supplier Stats...');
    // Note: This logic duplicates what's in SupplierService, but serves as an independent check
    const totalOrders = await prisma.purchaseOrder.count({
        where: { supplierId: supplier.id },
    });
    const totalSpend = await prisma.purchaseOrder.aggregate({
        where: { supplierId: supplier.id, status: 'RECEIVED' },
        _sum: { totalAmount: true },
    });

    console.log('Total Orders:', totalOrders);
    console.log('Total Spend:', totalSpend._sum.totalAmount);

    if (totalOrders !== 1) throw new Error('Total Orders mismatch');
    if (totalSpend._sum.totalAmount !== 500) throw new Error('Total Spend mismatch');

    // 6. Verify Product Price History
    console.log('6. Verifying Product Price History...');
    const priceHistory = await prisma.purchaseOrderItem.findMany({
        where: { productId: product.id },
        include: { purchaseOrder: true },
        orderBy: { purchaseOrder: { createdAt: 'desc' } },
    });
    console.log('Price History:', priceHistory);

    if (priceHistory.length !== 1) throw new Error('Price History length mismatch');
    if (priceHistory[0].unitPrice !== 50) throw new Error('Price History price mismatch');

    console.log('Test Completed Successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
