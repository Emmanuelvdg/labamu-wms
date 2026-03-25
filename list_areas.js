const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const areas = await prisma.warehouseFunctionalArea.findMany({
      include: { warehouse: true }
    });

    console.log('--- FUNCTIONAL AREAS ---');
    areas.forEach(area => {
      console.log(`- Area: "${area.name}" (ID: ${area.id}) in Warehouse: ${area.warehouse.name}`);
      console.log(`  Size: ${area.width}x${area.height}, Pos: ${area.x},${area.y}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
