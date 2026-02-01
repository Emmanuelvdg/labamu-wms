export { };
import { PrismaClient } from '@labamu/database';
import { InventoryService } from '../src/inventory/inventory.service';

const prisma = new PrismaClient();
// Mock NotificationService
const notificationService = { log: () => { } } as any;

async function main() {
    console.log('Reproducing Location Creation Bug...');

    // We need an instance of InventoryService? 
    // It's easier to just use Prisma directly to simulate what the API might be doing,
    // OR try to instantiate the service. Let's try to instantiate locally.
    // Note: UtilisationService dependency might make this hard.
    // Let's just create a raw location with Prisma to prove that missing warehouseId is possible,
    // AND then check the code in inventory.service.ts (I am doing that via view_file).

    // Actually, I should use the API logic if possible, but creating the service requires dependencies.
    // I can stick to the code analysis mostly, but let's see if we can trigger the issue.

    // 1. Find a valid parent
    const parent = await prisma.location.findFirst({
        where: { warehouseId: { not: null } }
    });

    if (!parent) {
        console.error('No parent location found.');
        return;
    }

    console.log(`Using Parent: ${parent.name} (Warehouse: ${parent.warehouseId})`);

    // 2. Try to create a child WITHOUT warehouseId via Prisma 
    // (This mimics the Service passing undefined)
    const bugChildName = `BugTest-${Date.now()}`;

    try {
        const child = await prisma.location.create({
            data: {
                name: bugChildName,
                parentId: parent.id,
                warehouseId: undefined, // Simulating missing param
                type: 'INTERNAL',
                structuralType: 'BIN'
            }
        });

        console.log(`Created Child: ${child.name}`);
        console.log(`Child Warehouse ID: ${child.warehouseId}`);

        if (!child.warehouseId) {
            console.error('FAIL: Child created without Warehouse ID! Bug Reproduced (at database level at least).');
        } else {
            console.log('PASS: Child somehow got a warehouse ID (Database trigger? Unlikely).');
        }

        // Cleanup
        await prisma.location.delete({ where: { id: child.id } });

    } catch (e) {
        console.error('Error creating child:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
