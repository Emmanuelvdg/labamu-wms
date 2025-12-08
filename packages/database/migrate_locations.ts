import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting location migration...');

    // 1. Find all locations without a structuralType
    const locations = await prisma.location.findMany({
        where: {
            structuralType: null
        },
        include: {
            parent: true
        }
    });

    console.log(`Found ${locations.length} locations to migrate.`);

    for (const location of locations) {
        let newType = '';

        if (!location.parentId) {
            // Root location -> WAREHOUSE
            newType = 'WAREHOUSE';
        } else if (location.parent && !location.parent.parentId) {
            // Child of Root -> ROOM (Safe default for now)
            newType = 'ROOM';
        } else {
            // Deeper levels -> Leave null for manual assignment or infer if possible
            // For now, we'll just log them
            console.log(`Skipping deep location ${location.name} (${location.id}) - requires manual assignment.`);
            continue;
        }

        console.log(`Migrating ${location.name} (${location.id}) to ${newType}`);
        await prisma.location.update({
            where: { id: location.id },
            data: { structuralType: newType }
        });
    }

    console.log('Migration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
