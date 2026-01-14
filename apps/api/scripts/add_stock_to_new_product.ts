
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function addStock() {
    try {
        console.log('📦 Seeding Stock for E2E-PROD-NEW...');

        const sku = 'E2E-PROD-NEW';

        // Find or create the product if it doesn't exist (it should, as the order exists)
        let product = await prisma.product.findUnique({
            where: { sku }
        });

        if (!product) {
            console.log(`Product ${sku} not found, creating it...`);
            product = await prisma.product.create({
                data: {
                    sku,
                    name: 'E2E New Product',
                    category: 'E2E',
                    status: 'Active',
                    isStockable: true
                }
            });
        }

        // Find E2E Warehouse
        const warehouse = await prisma.warehouse.findFirst({
            where: { name: 'E2E Warehouse' }
        });

        if (!warehouse) {
            throw new Error('E2E Warehouse not found!');
        }

        // Upsert inventory
        const inventory = await prisma.productInventory.findFirst({
            where: {
                productId: product.id,
                warehouseId: warehouse.id
            }
        });

        if (inventory) {
            await prisma.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: 500 } // Set to 500
            });
            console.log(`✅ Updated inventory for ${sku} to 500 in ${warehouse.name}`);
        } else {
            await prisma.productInventory.create({
                data: {
                    productId: product.id,
                    warehouseId: warehouse.id,
                    quantity: 500,
                    reserved: 0
                }
            });
            console.log(`✅ Created inventory for ${sku} (500) in ${warehouse.name}`);
        }

    } catch (error) {
        console.error('❌ Error adding stock:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

addStock();
