export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing Bin-02 Warehouse Assignment...');

    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Distribution Center 1' }
    });

    if (!warehouse) {
        console.error('Warehouse Distribution Center 1 not found!');
        return;
    }

    const bin02 = await prisma.location.findFirst({
        where: { name: 'Bin-02' }
    });

    if (bin02) {
        if (bin02.warehouseId !== warehouse.id) {
            console.log(`Updating Bin-02 (ID: ${bin02.id}) to Warehouse ${warehouse.id}`);
            await prisma.location.update({
                where: { id: bin02.id },
                data: { warehouseId: warehouse.id }
            });
            console.log('✅ Update successful.');
        } else {
            console.log('Bin-02 is already assigned to the correct warehouse.');
        }
    } else {
        console.error('Bin-02 location not found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
