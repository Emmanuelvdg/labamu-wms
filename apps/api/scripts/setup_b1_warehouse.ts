import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  // Create Warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'B1 Warehouse',
      shortCode: 'B1W',
      address: '123 B1 Street'
    }
  });

  // Create Location Zone
  const zone = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      type: 'ZONE',
      name: 'B1-ZONE',
      code: 'B1Z'
    }
  });

  // Create Storage Location
  const bin1 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      parentId: zone.id,
      type: 'BIN',
      name: 'B1-BIN-01',
      code: 'B1B01'
    }
  });

  const bin2 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      parentId: zone.id,
      type: 'BIN',
      name: 'B1-BIN-02',
      code: 'B1B02'
    }
  });

  // Get a product
  const product = await prisma.product.findFirst();

  // Create Batches & Inventory
  const batch1 = await prisma.batch.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      batchNumber: 'B1-BATCH-01',
      quantity: 50
    }
  });

  await prisma.inventory.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      locationId: bin1.id,
      productId: product.id,
      batchId: batch1.id,
      quantity: 50
    }
  });

  const batch2 = await prisma.batch.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      batchNumber: 'B1-BATCH-02',
      quantity: 30
    }
  });

  await prisma.inventory.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      locationId: bin2.id,
      productId: product.id,
      batchId: batch2.id,
      quantity: 30
    }
  });

  console.log('B1 Warehouse created with inventory');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
