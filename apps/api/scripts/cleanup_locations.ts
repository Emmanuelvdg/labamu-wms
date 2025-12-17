import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning Up Hierarchy Violations ---');

    const locations = await prisma.location.findMany({
        include: { parent: true }
    });

    const validParents: { [key: string]: string[] } = {
        'POSITION': ['SHELF'],
        'SHELF': ['BAY'],
        'BAY': ['ROW'],
        'ROW': ['ROOM'],
        'ROOM': ['WAREHOUSE'],
    };

    let deleted = 0;

    for (const loc of locations) {
        // Skip ROOT types or special types that don't need parents
        if (loc.structuralType === 'WAREHOUSE') continue;
        if (loc.type === 'VIEW' && !loc.parentId) continue; // Root views are allowed

        let isInvalid = false;

        // Check Orphan
        if (!loc.parentId) {
            // If it has no parent, and it's not a WAREHOUSE or Root VIEW, it's an orphan.
            // Even if structuralType is null, it should probably have a parent if it's INTERNAL?
            // Let's assume INTERNAL locations without parent are invalid unless they are WAREHOUSE.
            if (loc.type === 'INTERNAL' && !loc.structuralType) {
                console.log(`[DELETE] Orphan Internal Location (No Struct Type): ${loc.name} (ID: ${loc.id})`);
                isInvalid = true;
            } else if (loc.structuralType) {
                console.log(`[DELETE] Orphan Location: ${loc.name} (ID: ${loc.id}, Type: ${loc.structuralType})`);
                isInvalid = true;
            }
        } else {
            // Check Parent Type
            const parentType = loc.parent?.structuralType;
            if (parentType) {
                const allowedParents = validParents[loc.structuralType];
                if (allowedParents && !allowedParents.includes(parentType)) {
                    console.log(`[DELETE] Invalid Parent: ${loc.name} (Type: ${loc.structuralType}) has parent ${loc.parent?.name} (Type: ${parentType})`);
                    isInvalid = true;
                }
            }
        }

        if (isInvalid) {
            try {
                await prisma.location.delete({ where: { id: loc.id } });
                deleted++;
            } catch (e: any) {
                console.error(`Failed to delete ${loc.name}: ${e.message}`);
            }
        }
    }

    console.log(`--- Cleanup Complete. Deleted ${deleted} locations. ---`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
