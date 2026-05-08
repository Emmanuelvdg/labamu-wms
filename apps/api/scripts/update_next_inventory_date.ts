import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const locations = await prisma.location.findMany({
    where: { tenantId: tenant.id },
    take: 3
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const loc of locations) {
    await prisma.location.update({
      where: { id: loc.id },
      data: { nextInventoryDate: yesterday }
    });
    console.log(`Updated location ${loc.name} nextInventoryDate to yesterday`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
