
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function check() {
    console.log('Checking for Heatmap UI Warehouse...');

    // 1. Check Warehouse Entity
    const wh = await prisma.warehouse.findFirst({
        where: { name: 'Heatmap UI Warehouse' }
    });
    console.log('Warehouse Entity:', wh ? wh.id : 'NOT FOUND');

    // 2. Check Location Entity
    const loc = await prisma.location.findFirst({
        where: { name: 'Heatmap UI Warehouse', structuralType: 'WAREHOUSE' }
    });
    console.log('Location Entity:', loc ? loc.id : 'NOT FOUND');

    if (loc) {
        console.log('Location Details:', JSON.stringify(loc, null, 2));
    }
}

check()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
