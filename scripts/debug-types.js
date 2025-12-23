
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    const locations = await prisma.location.findMany();
    const counts = {};
    const types = new Set();
    locations.forEach(l => {
        counts[l.structuralType] = (counts[l.structuralType] || 0) + 1;
        types.add(l.structuralType);
    });
    console.log('Structural Types Found:', JSON.stringify(counts));

    // List generic 'type' as well
    const genericCounts = {};
    locations.forEach(l => {
        genericCounts[l.type] = (genericCounts[l.type] || 0) + 1;
    });
    console.log('Generic Types Found:', JSON.stringify(genericCounts));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
