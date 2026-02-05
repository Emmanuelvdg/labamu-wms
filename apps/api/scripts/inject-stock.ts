export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Injecting Stock for Outbound E2E...');

    // 1. Get Product
    const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } });
    if (!product) {
        console.error('Product LAP-X not found!');
        return;
    }

    // 2. Get Bin 01
    const bin01 = await prisma.location.findFirst({ where: { name: 'Bin 01' } });
    if (!bin01) {
        console.error('Bin 01 not found!');
        return;
    }

    // 3. Check existing stock
    const stock = await prisma.productInventory.findFirst({
        where: { productId: product.id, locationId: bin01.id }
    });

    if (!stock || stock.quantity < 2) {
        console.log(`Injecting 10 units of LAP-X to Bin 01...`);

        if (stock) {
            await prisma.productInventory.update({
                where: { id: stock.id },
                data: { quantity: 10 }
            });
        } else {
            // Need to get warehouseId for the inventory record
            const warehouse = await prisma.warehouse.findFirst();
            if (!warehouse) {
                console.error('No warehouse found!');
                return;
            }

            await prisma.productInventory.create({
                data: {
                    productId: product.id,
                    warehouseId: warehouse.id,
                    locationId: bin01.id,
                    quantity: 10
                }
            });
        }
        console.log('✅ Stock injected.');
    } else {
        console.log(`✅ Sufficient stock exists: ${stock.quantity}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
