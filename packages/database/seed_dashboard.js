
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db'
        }
    }
});

async function main() {
    console.log('🌱 Seeding Dashboard Data...');

    // 1. Ensure a Product exists
    let product = await prisma.product.findFirst();
    if (!product) {
        console.log('Creating dummy product...');
        product = await prisma.product.create({
            data: {
                sku: 'TEST-SKU-001-' + Date.now(),
                name: 'Test Product for Dashboard',
                category: 'Electronics',
                averageCost: 500000,
                status: 'Active',
                inventory: {
                    create: {
                        warehouseId: (await getWarehouseId()), // Helper needed? Or just create one inline if empty
                        quantity: 100,
                        id: undefined // Let it generate UUID
                    }
                }
            }
        });
    }

    // Helper to get a valid warehouse ID
    async function getWarehouseId() {
        const wh = await prisma.warehouse.findFirst();
        if (wh) return wh.id;
        const newWh = await prisma.warehouse.create({
            data: {
                name: 'Main Warehouse',
                type: 'INTERNAL',
                location: '{}'
            }
        });
        return newWh.id;
    }

    // 2. Create Shipped Orders over last 7 days
    const today = new Date();
    const customerId = 'CUST-DEMO';

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        // Random number of orders per day (0 to 5)
        const numOrders = Math.floor(Math.random() * 5) + 1;

        console.log(`Creating ${numOrders} orders for ${date.toISOString().split('T')[0]}`);

        for (let j = 0; j < numOrders; j++) {
            await prisma.order.create({
                data: {
                    customerId,
                    status: 'SHIPPED',
                    priority: 'NORMAL',
                    createdAt: date,
                    updatedAt: date, // Important for our 'shipped date' logic
                    items: {
                        create: {
                            productId: product.id,
                            quantity: Math.floor(Math.random() * 5) + 1
                        }
                    }
                }
            });
        }
    }

    // 3. Create some Stock Transactions for SAF-T report
    console.log('Creating stock transactions...');
    for (let i = 0; i < 5; i++) {
        await prisma.stockTransaction.create({
            data: {
                productId: product.id,
                type: 'OUT',
                quantity: 5,
                date: new Date(),
                referenceId: `REF-${i}`
            }
        });
    }

    console.log('✅ Seeding complete! Dashboard should now show data.');
}

main()
    .catch(e => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
