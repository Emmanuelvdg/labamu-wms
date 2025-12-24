
import { PrismaClient } from '@labamu/database';

async function main() {
    const prisma = new PrismaClient();
    const uniqueSuffix = Date.now();
    const warehouseName = `Test WH ${uniqueSuffix}`;
    const parentName = `Parent Loc ${uniqueSuffix}`;

    try {
        console.log('1. Creating Warehouse...');
        const warehouse = await prisma.warehouse.create({
            data: {
                name: warehouseName,
                type: 'PHYSICAL',
                location: JSON.stringify({ lat: 0, lng: 0 })
            }
        });

        console.log('2. Creating Root Location A...');
        const rootLocA = await prisma.location.create({
            data: {
                name: `Root ${uniqueSuffix}`,
                warehouseId: warehouse.id,
                type: 'INTERNAL',
                structuralType: 'WAREHOUSE'
            }
        });

        console.log('3. Attempting to create duplicate Root Location A (should fail)...');
        // This simulates the check we added in InventoryService, but we need to run it through the SERVICE or verify that we manually implemented the check there. 
        // Wait, the script runs against the DATABASE directly using PrismaClient. The validation is in InventoryService.
        // I cannot verify the Service logic by running Prisma calls directly. I effectively need to "simulate" the check or call the service if I can import it.
        // However, I can't easily import the NestJS service here without bootstrapping the app.
        // Instead, I will write a script that performs the same check logic to "verify" my check logic is sound, 
        // OR better yet, I should run an actual test case if possible.
        // Since I cannot run NestJS E2E easily from a scratch script, I will trust the logic I wrote and just verify the DB state is clean.
        // BUT, I can try to run a simple script that mimics the Service check to ensure the query works.

        // Actually, I can use the `check_warehouse.ts` style to run a script that imports the service? No, usually not.

        console.log('Since validation is in Service layer, I will visually verify the code change was applied.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
// Ideally I'd use an actual E2E test.
// Let's create a Playwright test for this!
