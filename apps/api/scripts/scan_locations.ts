import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Scanning for Hierarchy Violations (Limit 50) ---');

    const locations = await prisma.location.findMany({
        include: { parent: true },
        take: 50
    });

    const validParents: { [key: string]: string[] } = {
        'POSITION': ['SHELF'],
        'SHELF': ['BAY'],
        'BAY': ['ROW'],
        'ROW': ['ROOM'],
        'ROOM': ['WAREHOUSE'],
    };

    let violations = 0;

    for (const loc of locations) {
        // Skip locations without structural type (e.g. VIEW, INTERNAL) unless we want to enforce it there too?
        // The service only enforced it for structural types.
        if (!loc.structuralType) continue;

        // Root types
        if (loc.structuralType === 'WAREHOUSE') {
            // Warehouses can be roots, so no parent needed.
            // But if they have a parent, is that allowed? Yes, maybe a larger zone? 
            // For now, assume WAREHOUSE is always valid as root.
            continue;
        }

        // Non-root structural types must have a parent
        if (!loc.parentId) {
            console.log(`[VIOLATION] Orphan Location: ${loc.name} (ID: ${loc.id}, Type: ${loc.structuralType})`);
            violations++;
            continue;
        }

        // Check Parent Type
        const parentType = loc.parent?.structuralType;
        if (!parentType) {
            // If parent has no structural type (e.g. VIEW), is that allowed?
            // The service code said: "if (!parentType) return;" -> assumes flexible if parent is not structural.
            // So we skip this check.
            continue;
        }

        const allowedParents = validParents[loc.structuralType];
        if (allowedParents && !allowedParents.includes(parentType)) {
            console.log(`[VIOLATION] Invalid Parent: ${loc.name} (Type: ${loc.structuralType}) has parent ${loc.parent?.name} (Type: ${parentType})`);
            violations++;
        }
    }

    console.log(`--- Scan Complete. Found ${violations} violations. ---`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
