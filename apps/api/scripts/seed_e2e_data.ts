import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function seedE2eData() {
    try {
        console.log('🌱 Seeding E2E Test Data...\n');

        // ==========================================
        // 1. Warehouse: E2E Warehouse
        // ==========================================
        let warehouse = await prisma.warehouse.findFirst({
            where: { name: 'E2E Warehouse' }
        });

        if (!warehouse) {
            console.log('Creating E2E Warehouse...');
            warehouse = await prisma.warehouse.create({
                data: {
                    name: 'E2E Warehouse',
                    type: 'PHYSICAL', // Assuming enum or string
                    shortName: 'E2E',
                    companyId: 'default-company', // Optional but good to have
                    gridEnabled: true,
                    gridSize: 1.0,
                    floorPlanWidth: 50.0,
                    floorPlanHeight: 30.0,
                }
            });
            console.log(`✅ Created E2E Warehouse (ID: ${warehouse.id})`);
        } else {
            console.log(`✅ Found E2E Warehouse (ID: ${warehouse.id})`);
        }

        // ==========================================
        // 2. Product: E2E Test Product
        // ==========================================
        const productSku = 'E2E-TEST-PRODUCT-001';

        const product = await prisma.product.upsert({
            where: { sku: productSku },
            update: {
                name: 'E2E Test Product',
                category: 'E2E Testing',
                status: 'Active',
                isStockable: true
            },
            create: {
                sku: productSku,
                name: 'E2E Test Product',
                category: 'E2E Testing',
                classification: 'A',
                type: 'Finished',
                unitOfMeasure: 'Piece',
                isStockable: true,
                status: 'Active',
                averageCost: 10.0,
                description: 'Product for E2E automated testing',
                tracking: 'none',
                width: 10,
                height: 10,
                depth: 10,
                weight: 1.0,
            }
        });
        console.log(`✅ Upserted E2E Product (SKU: ${product.sku})`);

        // ==========================================
        // 3. Inventory: Ensure Product is in Warehouse
        // ==========================================
        // Create initial stock if 0
        const inventory = await prisma.productInventory.findFirst({
            where: {
                productId: product.id,
                warehouseId: warehouse.id
            }
        });

        if (!inventory) {
            await prisma.productInventory.create({
                data: {
                    productId: product.id,
                    warehouseId: warehouse.id,
                    quantity: 100, // Initial stock
                    reserved: 0
                }
            });
            console.log('✅ Created initial inventory in E2E Warehouse');
        } else {
            // Optional: Reset stock to 100 if low?
            if (inventory.quantity < 10) {
                await prisma.productInventory.update({
                    where: { id: inventory.id },
                    data: { quantity: 100 }
                });
                console.log('✅ Refilled inventory to 100');
            } else {
                console.log(`✅ Inventory exists (${inventory.quantity} units)`);
            }
        }

        // Also seed in "Main Factory" if it exists, as that is often the default
        const mainFactory = await prisma.warehouse.findFirst({
            where: { name: 'Main Factory' }
        });

        if (mainFactory) {
            const mfInventory = await prisma.productInventory.findFirst({
                where: { productId: product.id, warehouseId: mainFactory.id }
            });
            if (!mfInventory) {
                await prisma.productInventory.create({
                    data: {
                        productId: product.id,
                        warehouseId: mainFactory.id,
                        quantity: 100,
                        reserved: 0
                    }
                });
                console.log('✅ Created initial inventory in Main Factory');
            }
        }


        console.log('\n🎉 E2E Seeding Complete!');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedE2eData();
