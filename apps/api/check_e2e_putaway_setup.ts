import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkE2ESetup() {
    console.log('=== E2E Putaway Test Data Check ===\n');

    // Find the E2E test warehouse
    const warehouse = await prisma.warehouse.findFirst({
        where: { name: { contains: 'E2E Putaway' } }
    });

    if (!warehouse) {
        console.log('❌ E2E Putaway Test Warehouse not found');
        return;
    }

    console.log(`✅ Warehouse: ${warehouse.name} (${warehouse.code})`);
    console.log(`   ID: ${warehouse.id}\n`);

    // Find all locations for this warehouse
    const locations = await prisma.location.findMany({
        where: { warehouseId: warehouse.id },
        orderBy: { name: 'asc' }
    });

    console.log(`📍 Locations (${locations.length}):`);
    locations.forEach(loc => {
        console.log(`   - ${loc.name}`);
        console.log(`     Type: ${loc.type}`);
        console.log(`     ID: ${loc.id}`);
    });

    // Check if there are any locations that match receiving criteria
    const receivingLocations = locations.filter(l =>
        l.type === 'VENDOR' ||
        l.name.toUpperCase().includes('RECEIVING') ||
        l.name.toUpperCase().includes('STAGING')
    );

    console.log(`\n🔍 Receiving Locations (${receivingLocations.length}):`);
    if (receivingLocations.length === 0) {
        console.log('   ❌ No receiving locations found!');
        console.log('   Expected: type="VENDOR" OR name contains "RECEIVING" OR name contains "STAGING"');
    } else {
        receivingLocations.forEach(loc => {
            console.log(`   ✅ ${loc.name} (type: ${loc.type})`);
        });
    }

    // Check for products
    const products = await prisma.product.findMany({
        where: { sku: { contains: 'E2E-PUTAWAY' } }
    });

    console.log(`\n📦 Products (${products.length}):`);
    products.forEach(p => {
        console.log(`   - ${p.name} (SKU: ${p.sku})`);
        console.log(`     ID: ${p.id}`);
    });

    // Check for suppliers
    const suppliers = await prisma.supplier.findMany({
        where: { name: { contains: 'E2E Putaway' } }
    });

    console.log(`\n🏢 Suppliers (${suppliers.length}):`);
    suppliers.forEach(s => {
        console.log(`   - ${s.name}`);
        console.log(`     ID: ${s.id}`);
    });

    await prisma.$disconnect();
}

checkE2ESetup().catch(console.error);
