import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGridUpdate() {
    try {
        // Get first warehouse
        const warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            console.log('No warehouse found!');
            return;
        }

        console.log('Warehouse before update:', {
            id: warehouse.id,
            name: warehouse.name,
            gridEnabled: warehouse.gridEnabled,
            gridSize: warehouse.gridSize,
            snapToGrid: warehouse.snapToGrid
        });

        // Test update
        const updated = await prisma.warehouse.update({
            where: { id: warehouse.id },
            data: {
                gridEnabled: !warehouse.gridEnabled
            },
            select: {
                id: true,
                name: true,
                gridEnabled: true,
                gridSize: true,
                snapToGrid: true
            }
        });

        console.log('Warehouse after update:', updated);
        console.log('✅ Grid toggle test PASSED!');
    } catch (error) {
        console.error('❌ Grid toggle test FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testGridUpdate();
