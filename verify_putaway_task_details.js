const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function checkTaskDetails() {
    const tasks = await prisma.putawayTask.findMany({
        include: {
            product: true,
            sourceLocation: true,
            destinationLocation: true
        }
    });

    console.log(`Total putaway tasks: ${tasks.length}`);
    tasks.forEach(t => {
        console.log(`Task ID: ${t.id}`);
        console.log(`- Product: ${t.product.name} (SKU: ${t.product.sku})`);
        console.log(`- Status: ${t.status}`);
        console.log(`- Source: ${t.sourceLocation.name} (Type: ${t.sourceLocation.type})`);
        console.log(`- Destination: ${t.destinationLocation.name} (Type: ${t.destinationLocation.structuralType})`);
        console.log(`- Qty: ${t.quantity}, Putaway Qty: ${t.putawayQuantity}`);
    });

    await prisma.$disconnect();
}

checkTaskDetails();
