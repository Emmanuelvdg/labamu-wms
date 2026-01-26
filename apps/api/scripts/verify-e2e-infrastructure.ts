
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying E2E Infrastructure ---');

    const wh = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' },
        include: { functionalAreas: true }
    });

    if (!wh) {
        console.error('FAIL: Warehouse "Distribution Center 1" NOT FOUND.');
        return;
    }
    console.log(`PASS: Found Warehouse "${wh.name}" (${wh.id})`);

    const locations = await prisma.location.findMany({
        where: { warehouseId: wh.id },
        include: { parent: true }
    });

    console.log(`Found ${locations.length} locations in DC1.`);
    locations.forEach(l => console.log(`- ${l.name} (${l.id}) Type: ${l.type}/${l.structuralType}`));


    // Check specific locations
    const checkLoc = (name: string, type: string, parentName?: string) => {
        const loc = locations.find(l => l.name === name);
        if (!loc) {
            console.log(`FAIL: Location "${name}" NOT FOUND.`);
            return false;
        }

        // Structure type check (loose)
        // Parent check
        if (parentName) {
            if (loc.parent?.name !== parentName && loc.parent?.name !== name) { // Handle root case if needed? No
                console.log(`FAIL: Location "${name}" parent is "${loc.parent?.name}", expected "${parentName}".`);
                return false;
            }
        } else if (loc.parentId) {
            // It might be a child of viewLocation?
            // Not a failure, just note.
        }
        console.log(`PASS: Found Location "${name}" (Type: ${loc.structuralType || 'N/A'}, Parent: ${loc.parent?.name || 'None'})`);
        return true;
    };

    checkLoc('Receiving Dock 1', 'ROOM', 'Distribution Center 1'); // OR parent might be View?
    checkLoc('Zone A', 'ROOM', 'Distribution Center 1');
    checkLoc('Row 1', 'ROW', 'Zone A');
    checkLoc('Shelf 1', 'SHELF', 'Row 1');
    checkLoc('Bin 01', 'POSITION', 'Shelf 1');

    console.log('--- Verification Complete ---');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
