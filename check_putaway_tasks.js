const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function checkTasks() {
    const tasks = await prisma.putawayTask.findMany({
        include: { product: true }
    });

    console.log(`Total putaway tasks: ${tasks.length}`);
    tasks.forEach(t => {
        console.log(`- ${t.id}: ${t.product.name} (${t.status})`);
    });

    await prisma.$disconnect();
}

checkTasks();
