
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all locations...');
    const locations = await prisma.location.findMany();

    console.log(`Total locations found: ${locations.length}`);

    // Count by structuralType
    const counts = {};
    locations.forEach(l => {
        counts[l.structuralType] = (counts[l.structuralType] || 0) + 1;
    });
    console.log('Counts by structuralType:', counts);

    // Check specific hierarchy for "Zone A"
    const zoneA = locations.find(l => l.name === 'Zone A');
    if (zoneA) {
        console.log('\nFound Zone A:', JSON.stringify(zoneA, null, 2));

        // Find children
        const children = locations.filter(l => l.parentId === zoneA.id);
        console.log(`Children of Zone A: ${children.length}`);

        if (children.length > 0) {
            console.log('First 5 children of Zone A:');
            children.slice(0, 5).forEach(c => {
                console.log(`- ${c.name} (${c.structuralType}) [ID: ${c.id}]`);
            });
        }
    } else {
        console.log('Zone A not found');
    }

    // Check for any 'BAY' type locations
    const bays = locations.filter(l => l.structuralType === 'BAY');
    console.log(`\nTotal locations with structuralType 'BAY': ${bays.length}`);
    if (bays.length > 0) {
        console.log('First 5 Bays:', bays.slice(0, 5).map(b => `${b.name} (Parent: ${b.parentId})`));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
