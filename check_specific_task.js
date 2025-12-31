const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function checkSpecificTask() {
    const taskId = '3957b468-b8ff-4796-a5fc-a8b266945620';

    const task = await prisma.putawayTask.findUnique({
        where: { id: taskId },
        include: { product: true, destinationLocation: true, sourceLocation: true }
    });

    if (task) {
        console.log('✅ Task found!');
        console.log('ID:', task.id);
        console.log('Product:', task.product.name);
        console.log('Status:', task.status);
        console.log('Source:', task.sourceLocation?.name || 'N/A');
        console.log('Destination:', task.destinationLocation?.name || 'N/A');
    } else {
        console.log('❌ Task NOT found');
    }

    await prisma.$disconnect();
}

checkSpecificTask();
