
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function verifyStocktakingSchema() {
    console.log('Verifying Stocktaking Schema...');

    // 1. Setup: Get a Warehouse
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
        console.error('No warehouse found. Please seed data.');
        process.exit(1);
    }
    console.log('Found Warehouse:', warehouse.name);

    // 2. Setup: Get a Product
    const product = await prisma.product.findFirst();
    if (!product) {
        console.error('No product found.');
        process.exit(1);
    }
    console.log('Found Product:', product.name);

    // 3. Setup: Get a Location
    const location = await prisma.location.findFirst({ where: { warehouseId: warehouse.id } });
    if (!location) {
        console.error('No location found in warehouse.');
        process.exit(1);
    }
    console.log('Found Location:', location.name);

    // 4. Create StocktakeSession
    console.log('Creating StocktakeSession...');
    const session = await prisma.stocktakeSession.create({
        data: {
            warehouseId: warehouse.id,
            status: 'PLANNED',
            type: 'CYCLE_COUNT',
            description: 'E2E Verification Session'
        }
    });
    console.log('Created Session:', session.id);

    // 5. Create StocktakeTask
    console.log('Creating StocktakeTask...');
    const task = await prisma.stocktakeTask.create({
        data: {
            sessionId: session.id,
            locationId: location.id,
            productId: product.id,
            systemQuantity: 10,
            status: 'PENDING'
        }
    });
    console.log('Created Task:', task.id);

    // 6. Update Task (Count)
    console.log('Updating Task (simulating count)...');
    const updatedTask = await prisma.stocktakeTask.update({
        where: { id: task.id },
        data: {
            countedQuantity: 8,
            status: 'COUNTED',
            countedAt: new Date()
        }
    });
    console.log('Updated Task Count:', updatedTask.countedQuantity);

    // 7. Cleanup
    console.log('Cleaning up...');
    await prisma.stocktakeTask.delete({ where: { id: task.id } });
    await prisma.stocktakeSession.delete({ where: { id: session.id } });

    console.log('Schema Verification Passed!');
}

verifyStocktakingSchema()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
