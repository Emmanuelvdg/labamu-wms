
const { PrismaClient } = require('@labamu/database');

async function verifyDrag() {
    const prisma = new PrismaClient();
    try {
        const bin = await prisma.location.findFirst({
            where: { structuralType: { in: ['BIN', 'POSITION', 'SHELF'] } }
        });

        if (!bin) {
            console.log('No bins found');
            return;
        }

        console.log(`Original Bin ${bin.id}: x=${bin.x}, y=${bin.y}`);

        const newX = (bin.x || 0) + 10;
        const updated = await prisma.location.update({
            where: { id: bin.id },
            data: { x: newX }
        });

        console.log(`Updated Bin ${updated.id}: x=${updated.x}, y=${updated.y}`);

        if (updated.x === newX) {
            console.log('SUCCESS: Location update worked');
        } else {
            console.error('FAILURE: Location update did not persist');
        }

        // Revert
        await prisma.location.update({
            where: { id: bin.id },
            data: { x: bin.x }
        });
        console.log('Reverted changes');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDrag();

export { };
