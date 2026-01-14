
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying E2E Scenario 2.4 Preconditions ---');

    // 1. Check Warehouse
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'E2E Warehouse' }
    });
    console.log('Warehouse "E2E Warehouse":', warehouse ? 'FOUND' : 'NOT FOUND');

    // 2. Check Product
    // Checking both potential SKUs mentioned in test plan
    const skus = ['E2E-PROD-001', 'E2E-TEST-PRODUCT-001'];
    const products = await prisma.product.findMany({
        where: { sku: { in: skus } }
    });

    if (products.length === 0) {
        console.log('Product: NOT FOUND (Checked SKUs:', skus.join(', '), ')');
    } else {
        console.log('Product: FOUND');
        products.forEach(p => console.log(` - SKU: ${p.sku}, ID: ${p.id}`));
    }

    // 3. Check Stock
    if (warehouse && products.length > 0) {
        const productIds = products.map(p => p.id);
        const stock = await prisma.stock.findMany({
            where: {
                location: { warehouseId: warehouse.id },
                productId: { in: productIds }
            },
            include: { location: true, product: true }
        });

        console.log('Stock in E2E Warehouse:', stock.length > 0 ? 'FOUND' : 'NOT FOUND');
        stock.forEach(s => {
            console.log(` - ${s.product.sku} at ${s.location.name}: ${s.quantity}`);
        });
    }

    process.exit(0);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
