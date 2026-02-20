
const { PrismaClient } = require('../../../packages/database');

const prisma = new PrismaClient();

async function mergeFunctionalAreas() {
    console.log('Starting Functional Area Merge...');

    // 1. Get Warehouse (Distribution Center 1)
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' },
    });

    if (!warehouse) {
        console.error('Warehouse "Distribution Center 1" not found.');
        return;
    }
    console.log(`Processing Warehouse: ${warehouse.name} (${warehouse.id})`);

    // 2. Get Functional Areas and Locations
    const functionalAreas = await prisma.warehouseFunctionalArea.findMany({
        where: { warehouseId: warehouse.id },
    });

    const locations = await prisma.location.findMany({
        where: { warehouseId: warehouse.id, structuralType: { not: 'WAREHOUSE' } },
    });

    console.log(`Found ${functionalAreas.length} Functional Areas and ${locations.length} Locations.`);

    // 3. Process each Functional Area
    for (const area of functionalAreas) {
        // Find matching Location
        // Try strict name match, then fuzzy "Storage" -> "Main Storage" logic
        let match = locations.find(l => l.name === area.name);

        if (!match && area.name === 'Main Storage') {
            match = locations.find(l => l.name === 'Storage');
        }

        // Determine Color (default Blue if missing)
        const color = area.color || '#3b82f6';

        if (match) {
            console.log(`Merging FA "${area.name}" -> Location "${match.name}" (${match.id})`);

            // Update Location
            const existingAttrs = match.attributes ? JSON.parse(match.attributes) : {};
            const newAttrs = {
                ...existingAttrs,
                color: color
            };

            await prisma.location.update({
                where: { id: match.id },
                data: {
                    name: area.name, // Rename Location to match FA (e.g. Storage -> Main Storage)
                    x: area.x,
                    y: area.y,
                    width: area.width,
                    height: area.height,
                    rotation: area.rotation,
                    attributes: JSON.stringify(newAttrs),
                    // Ensure it's a "ROOM" or "ZONE" if it was generic
                    structuralType: match.structuralType || 'ROOM'
                }
            });
        } else {
            console.log(`Promoting FA "${area.name}" -> New Location`);

            // Determine type based on name or areaType
            let type = 'ROOM';
            if (area.name.includes('Dock')) type = 'ROOM'; // Or distinct type if supported

            const newAttrs = { color: color };

            await prisma.location.create({
                data: {
                    name: area.name,
                    warehouseId: warehouse.id,
                    parentId: null, // Root child
                    structuralType: type,
                    type: 'INTERNAL',
                    x: area.x,
                    y: area.y,
                    width: area.width,
                    height: area.height,
                    rotation: area.rotation,
                    attributes: JSON.stringify(newAttrs)
                }
            });
        }

        // Delete Functional Area
        await prisma.warehouseFunctionalArea.delete({
            where: { id: area.id }
        });
        console.log(`Deleted FA "${area.name}"`);
    }

    // 4. Cleanup old "Storage" or "Dock" locations if they were NOT matched?
    // Actually, if we matched "Main Storage" -> "Storage", we renamed "Storage".
    // If user has "Receiving Dock" (Loc) and "Receiving Dock" (FA), we matched and updated.
    // If user has "Old Dock" (Loc) but NO "Old Dock" (FA), it remains untouched. 
    // This is safer than deleting everything.

    console.log('Merge Complete.');
}

mergeFunctionalAreas()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

export { };
