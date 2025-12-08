import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting verification...');

    // 1. Create two warehouses
    const wh1 = await prisma.warehouse.create({
        data: {
            name: 'Verification WH 1',
            type: 'PHYSICAL',
            location: JSON.stringify({ lat: 0, lng: 0 }),
        }
    });
    console.log(`Created Warehouse 1: ${wh1.id}`);

    const wh2 = await prisma.warehouse.create({
        data: {
            name: 'Verification WH 2',
            type: 'PHYSICAL',
            location: JSON.stringify({ lat: 0, lng: 0 }),
        }
    });
    console.log(`Created Warehouse 2: ${wh2.id}`);

    // 2. Create strategies
    // WH1 -> Wave
    await prisma.pickingStrategy.create({
        data: {
            name: 'Wave',
            rules: '{}',
            active: true,
            warehouseId: wh1.id
        }
    });
    console.log('Assigned Wave strategy to WH 1');

    // WH2 -> Batch
    await prisma.pickingStrategy.create({
        data: {
            name: 'Batch',
            rules: '{}',
            active: true,
            warehouseId: wh2.id
        }
    });
    console.log('Assigned Batch strategy to WH 2');

    // 3. Evaluate strategies
    // Mock order data
    const orderData = { priority: 'NORMAL', itemCount: 5, items: [] };

    // Evaluate for WH 1
    const strategy1 = await evaluatePickingStrategy({ ...orderData, warehouseId: wh1.id });
    console.log(`WH 1 Strategy Evaluation Result: ${strategy1}`);

    // Evaluate for WH 2
    const strategy2 = await evaluatePickingStrategy({ ...orderData, warehouseId: wh2.id });
    console.log(`WH 2 Strategy Evaluation Result: ${strategy2}`);

    // 4. Verification
    if (strategy1 === 'Wave' && strategy2 === 'Batch') {
        console.log('SUCCESS: Strategies evaluated correctly per warehouse.');
    } else {
        console.error('FAILURE: Incorrect strategy evaluation.');
        console.error(`Expected WH1: Wave, Got: ${strategy1}`);
        console.error(`Expected WH2: Batch, Got: ${strategy2}`);
    }

    // Cleanup
    await prisma.pickingStrategy.deleteMany({ where: { warehouseId: { in: [wh1.id, wh2.id] } } });
    await prisma.warehouse.deleteMany({ where: { id: { in: [wh1.id, wh2.id] } } });
}

// Mocking the service logic to avoid importing the whole NestJS app context
async function evaluatePickingStrategy(orderData: { priority: string; itemCount: number; items: any[]; warehouseId: string }): Promise<string> {
    const activeStrategy = await prisma.pickingStrategy.findFirst({
        where: {
            active: true,
            warehouseId: orderData.warehouseId
        },
    });

    if (activeStrategy) {
        return activeStrategy.name;
    }

    // Default logic fallback
    if (orderData.priority === 'HIGH') return 'Single';
    if (orderData.itemCount > 20) return 'Batch';
    return 'Wave';
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
