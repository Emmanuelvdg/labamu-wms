/**
 * Create Test Location Hierarchy for Picking Breadcrumb Testing
 * 
 * This script creates a realistic warehouse location structure:
 * Central DC
 *   └─ Main Floor (Room)
 *      ├─ Aisle A (Row)
 *      │  ├─ Bay 1
 *      │  │  ├─ Shelf 1
 *      │  │  │  └─ Position A1
 *      │  │  └─ Shelf 2
 *      │  │     └─ Position A2
 *      │  └─ Bay 2
 *      │     └─ Shelf 1
 *      │        └─ Position B1
 *      └─ Aisle B (Row)
 *         └─ Bay 1
 *            └─ Shelf 1
 *               └─ Position C1
 * 
 * This hierarchy tests:
 * - 6-level deep breadcrumb (Position → Shelf → Bay → Aisle → Room → Warehouse)
 * - Multiple branches (different aisles, bays, shelves)
 * - Realistic warehouse naming conventions
 */

import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('🏭 Creating Test Location Hierarchy...\n');

    // Level 1: Warehouse (no parent)
    console.log('Creating Warehouse...');
    const warehouse = await prisma.location.upsert({
        where: { id: 'loc-wh-central' },
        update: {},
        create: {
            id: 'loc-wh-central',
            name: 'Central DC',
            type: 'INTERNAL',
            structuralType: 'WAREHOUSE'
        }
    });
    console.log('✅ Warehouse:', warehouse.name);

    // Level 2: Room
    console.log('\nCreating Room...');
    const mainFloor = await prisma.location.upsert({
        where: { id: 'loc-room-mainfloor' },
        update: {},
        create: {
            id: 'loc-room-mainfloor',
            name: 'Main Floor',
            type: 'INTERNAL',
            structuralType: 'ROOM',
            parentId: warehouse.id
        }
    });
    console.log('✅ Room:', mainFloor.name);

    // Level 3: Aisles
    console.log('\nCreating Aisles...');
    const aisleA = await prisma.location.upsert({
        where: { id: 'loc-aisle-a' },
        update: {},
        create: {
            id: 'loc-aisle-a',
            name: 'Aisle A',
            type: 'INTERNAL',
            structuralType: 'ROW',
            parentId: mainFloor.id
        }
    });
    console.log('✅ Aisle A');

    const aisleB = await prisma.location.upsert({
        where: { id: 'loc-aisle-b' },
        update: {},
        create: {
            id: 'loc-aisle-b',
            name: 'Aisle B',
            type: 'INTERNAL',
            structuralType: 'ROW',
            parentId: mainFloor.id
        }
    });
    console.log('✅ Aisle B');

    // Level 4: Bays
    console.log('\nCreating Bays...');
    const bayA1 = await prisma.location.upsert({
        where: { id: 'loc-bay-a1' },
        update: {},
        create: {
            id: 'loc-bay-a1',
            name: 'Bay 1',
            type: 'INTERNAL',
            structuralType: 'BAY',
            parentId: aisleA.id
        }
    });
    console.log('✅ Aisle A → Bay 1');

    const bayA2 = await prisma.location.upsert({
        where: { id: 'loc-bay-a2' },
        update: {},
        create: {
            id: 'loc-bay-a2',
            name: 'Bay 2',
            type: 'INTERNAL',
            structuralType: 'BAY',
            parentId: aisleA.id
        }
    });
    console.log('✅ Aisle A → Bay 2');

    const bayB1 = await prisma.location.upsert({
        where: { id: 'loc-bay-b1' },
        update: {},
        create: {
            id: 'loc-bay-b1',
            name: 'Bay 1',
            type: 'INTERNAL',
            structuralType: 'BAY',
            parentId: aisleB.id
        }
    });
    console.log('✅ Aisle B → Bay 1');

    // Level 5: Shelves
    console.log('\nCreating Shelves...');
    const shelfA1_1 = await prisma.location.upsert({
        where: { id: 'loc-shelf-a1-1' },
        update: {},
        create: {
            id: 'loc-shelf-a1-1',
            name: 'Shelf 1',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: bayA1.id
        }
    });
    console.log('✅ Aisle A → Bay 1 → Shelf 1');

    const shelfA1_2 = await prisma.location.upsert({
        where: { id: 'loc-shelf-a1-2' },
        update: {},
        create: {
            id: 'loc-shelf-a1-2',
            name: 'Shelf 2',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: bayA1.id
        }
    });
    console.log('✅ Aisle A → Bay 1 → Shelf 2');

    const shelfA2_1 = await prisma.location.upsert({
        where: { id: 'loc-shelf-a2-1' },
        update: {},
        create: {
            id: 'loc-shelf-a2-1',
            name: 'Shelf 1',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: bayA2.id
        }
    });
    console.log('✅ Aisle A → Bay 2 → Shelf 1');

    const shelfB1_1 = await prisma.location.upsert({
        where: { id: 'loc-shelf-b1-1' },
        update: {},
        create: {
            id: 'loc-shelf-b1-1',
            name: 'Shelf 1',
            type: 'INTERNAL',
            structuralType: 'SHELF',
            parentId: bayB1.id
        }
    });
    console.log('✅ Aisle B → Bay 1 → Shelf 1');

    // Level 6: Positions
    console.log('\nCreating Positions...');
    const posA1 = await prisma.location.upsert({
        where: { id: 'loc-pos-a1' },
        update: {},
        create: {
            id: 'loc-pos-a1',
            name: 'Position A1',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelfA1_1.id
        }
    });
    console.log('✅ Position A1 (6-level hierarchy)');

    const posA2 = await prisma.location.upsert({
        where: { id: 'loc-pos-a2' },
        update: {},
        create: {
            id: 'loc-pos-a2',
            name: 'Position A2',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelfA1_2.id
        }
    });
    console.log('✅ Position A2');

    const posB1 = await prisma.location.upsert({
        where: { id: 'loc-pos-b1' },
        update: {},
        create: {
            id: 'loc-pos-b1',
            name: 'Position B1',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelfA2_1.id
        }
    });
    console.log('✅ Position B1');

    const posC1 = await prisma.location.upsert({
        where: { id: 'loc-pos-c1' },
        update: {},
        create: {
            id: 'loc-pos-c1',
            name: 'Position C1',
            type: 'INTERNAL',
            structuralType: 'POSITION',
            parentId: shelfB1_1.id
        }
    });
    console.log('✅ Position C1');

    // Summary
    console.log('\n📊 Summary:');
    console.log('='.repeat(60));
    console.log('Created 6-level location hierarchy:');
    console.log('- 1 Warehouse (Central DC)');
    console.log('- 1 Room (Main Floor)');
    console.log('- 2 Aisles (A, B)');
    console.log('- 3 Bays (A1, A2, B1)');
    console.log('- 4 Shelves');
    console.log('- 4 Positions (A1, A2, B1, C1)');
    console.log('='.repeat(60));

    console.log('\n🎯 Test Breadcrumb Paths:');
    console.log('Position A1: Central DC → Main Floor → Aisle A → Bay 1 → Shelf 1 → Position A1');
    console.log('Position B1: Central DC → Main Floor → Aisle A → Bay 2 → Shelf 1 → Position B1');
    console.log('Position C1: Central DC → Main Floor → Aisle B → Bay 1 → Shelf 1 → Position C1');

    console.log('\n✅ Location hierarchy created successfully!');
    console.log('📝 Next: Place inventory at these positions and create picking tasks to test breadcrumb display.');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
