
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Quick E2E State Check ---');

    console.log('checking dbs...')
    // 1. Check Warehouse
    const dc1 = await prisma.warehouse.findFirst({ where: { shortName: 'DC1' } });
    console.log(`Warehouse DC1: ${dc1 ? 'FOUND' : 'MISSING'}`);

    if (dc1) {
        // 2. Check Bin 01
        const bin01 = await prisma.location.findFirst({
            where: {
                warehouseId: dc1.id,
                name: 'Bin 01'
            }
        });
        console.log(`Location Bin 01: ${bin01 ? 'FOUND' : 'MISSING'}`);

        if (bin01) {
            // 3. Check Product
            const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } }); // Use LAP-X as per Test Plan
            console.log(`Product LAP-X: ${product ? 'FOUND' : 'MISSING'}`);

            if (product) {
                // 4. Check Inventory
                const inventory = await prisma.productInventory.findFirst({
                    where: {
                        warehouseId: dc1.id,
                        locationId: bin01.id,
                        productId: product.id
                    }
                });
                console.log(`Inventory in Bin 01: ${inventory ? inventory.quantity : 0}`);

                // 5. Check PO Status
                const po = await prisma.purchaseOrder.findFirst({
                    where: {
                        supplier: { name: 'TechSupplier Inc' },
                        items: { some: { productId: product.id } }
                    },
                    orderBy: { createdAt: 'desc' },
                    include: { supplier: true }
                });
                console.log(`Latest PO Status: ${po ? po.status : 'NONE'}`);
            }
        }
    }
}

main()
    .catch(e => {
        console.error('Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
