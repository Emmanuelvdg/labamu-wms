
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const prisma = app.get(PrismaService);

    console.log('--- Starting Location Code Migration ---');

    // 1. Fetch all locations
    const locations = await prisma.location.findMany({
        include: { parent: true }
    });
    console.log(`Found ${locations.length} locations`);

    // Helper to generate code from name
    const generateCode = (name: string) => {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric
            .slice(0, 10); // Limit length
    };

    // Helper to build full address (Materialized Path)
    // Needs a fresh fetch or a map to traverse up. 
    // Since we are iterating, let's build a map first.
    const locMap = new Map();
    locations.forEach(l => locMap.set(l.id, l));

    const getFullAddress = (loc: any): string => {
        // Use the code attached to the object (which we might have just updated)
        let code = loc.code || generateCode(loc.name);

        if (loc.parentId && locMap.has(loc.parentId)) {
            const parent = locMap.get(loc.parentId);
            return `${getFullAddress(parent)}.${code}`;
        }
        return code;
    }

    // Track used addresses to handle collisions in-memory before write
    const usedAddresses = new Set<string>();
    let updatedCount = 0;

    // We should ideally sort by depth (parents first) to ensure parent codes are stable 
    // before children compute their full address.
    // However, getFullAddress is recursive and uses the map. 
    // As long as we update the map *before* anyone calls getFullAddress() on us (as a parent), 
    // we need to be careful.
    // The safest way is to topological sort, or just rely on the fact that getFullAddress
    // calculates parent's address on the fly.
    // BUT, we need to ensure the parent's CODE is settled (collision resolved) before child uses it.
    // So we MUST process parents first.

    // Sort by depth (approximate by looking at parent chain length?)
    // Easier: Just do multiple passes or sort by number of ancestors.
    // Or simple sort: if A.parentId is null, it's root. 
    // Let's rely on a quick depth calculation.
    const getDepth = (loc: any): number => {
        let depth = 0;
        let curr = loc;
        while (curr.parentId && locMap.has(curr.parentId)) {
            depth++;
            curr = locMap.get(curr.parentId);
        }
        return depth;
    }

    locations.sort((a, b) => getDepth(a) - getDepth(b));

    for (const locObj of locations) {
        const loc = locObj as any; // Cast for access to new fields

        // 1. Generate Proposal Code
        let proposedCode = loc.code || generateCode(loc.name);
        if (!proposedCode) proposedCode = 'UNKNOWN';

        // 2. Resolve Parent Address
        let parentAddress = '';
        if (loc.parentId && locMap.has(loc.parentId)) {
            // Parent should have been processed already due to sort
            const parent = locMap.get(loc.parentId);
            // Use parent's full address directly if they have one now
            // (which they should, as we updated the map object in previous iter)
            if (parent.fullAddress) {
                parentAddress = parent.fullAddress;
            } else {
                // Fallback (shouldn't happen if sorted correctly)
                parentAddress = getFullAddress(parent);
            }
        }

        let proposedFullAddress = parentAddress ? `${parentAddress}.${proposedCode}` : proposedCode;

        // 3. Collision Resolution
        // If this address is already used, append suffix to CODE
        let uniqueSuffix = 1;
        let finalCode = proposedCode;
        let finalFullAddress = proposedFullAddress;

        while (usedAddresses.has(finalFullAddress)) {
            finalCode = `${proposedCode}-${uniqueSuffix}`;
            finalFullAddress = parentAddress ? `${parentAddress}.${finalCode}` : finalCode;
            uniqueSuffix++;
        }

        // 4. Update Memory 
        usedAddresses.add(finalFullAddress);
        loc.code = finalCode;
        loc.fullAddress = finalFullAddress;
        locMap.set(loc.id, loc);

        // 5. Update DB
        // Always write to ensure consistency
        await prisma.location.update({
            where: { id: loc.id },
            data: {
                code: finalCode,
                fullAddress: finalFullAddress
            } as any
        });

        console.log(`Processed ${loc.name}: ${finalFullAddress}`);
        updatedCount++;
    }

    console.log(`--- Migration Complete. Updated ${updatedCount} locations ---`);
    await app.close();
}

bootstrap();
