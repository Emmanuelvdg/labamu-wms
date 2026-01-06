import { PrismaClient } from '@labamu/database';
import { PutawayService } from '../../api/src/inventory/putaway.service';

const prisma = new PrismaClient();
// @ts-ignore
const putawayService = new PutawayService(prisma);

async function checkCapacity() {
    try {
        console.log('🧪 Verifying Ti-Hi Capacity Logic...');

        // 1. Setup Data
        const warehouse = await prisma.warehouse.create({ data: { name: 'Cap Test WH', type: 'PHYSICAL' } });
        const product = await prisma.product.create({ data: { sku: 'CAP-SKU-' + Date.now(), name: 'Cap Product', category: 'TEST' } });

        // Create Pallet Packaging: 100 units / pallet
        await prisma.productPackaging.create({
            data: {
                name: 'Test Pallet',
                unitType: 'PALLET',
                productId: product.id,
                quantity: 100,
                ti: 10,
                hi: 10 // 100 total
            }
        });

        const location = await prisma.location.create({ data: { name: 'Storage Bin', type: 'INTERNAL', warehouseId: warehouse.id } });

        // Add Max Pallets Attribute = 1
        const attrDef = await prisma.locationAttributeDefinition.findUnique({ where: { name: 'Max Pallets' } });
        if (!attrDef) throw new Error('Max Pallets attribute not seeded (run seed first)');

        await prisma.locationAttribute.create({
            data: {
                locationId: location.id,
                definitionId: attrDef.id,
                value: '1'
            }
        });

        // 2. Add existing inventory: 60 units (0.6 pallets)
        await prisma.productInventory.create({
            data: {
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: location.id,
                quantity: 60
            }
        });

        console.log('Setup: Location has 0.6 pallets (60/100). Limit is 1.');

        // 3. Check Capacity for 50 units (0.5 pallets) -> Total 1.1 -> Should FAIL
        console.log('Checking capacity for 50 units...');
        const resultFail = await putawayService.checkLocationCapacity(location.id, product.id, 50);

        if (resultFail.available === false) {
            console.log('✅ Correctly REJECTED 50 units:', resultFail.reason);
        } else {
            console.error('❌ FAILURE: Incorrectly ACCEPTED 50 units (should exceed limit).');
        }

        // 4. Check Capacity for 30 units (0.3 pallets) -> Total 0.9 -> Should PASS
        console.log('Checking capacity for 30 units...');
        const resultPass = await putawayService.checkLocationCapacity(location.id, product.id, 30);
        if (resultPass.available === true) {
            console.log('✅ Correctly ACCEPTED 30 units.');
        } else {
            console.error('❌ FAILURE: Incorrectly REJECTED 30 units:', resultPass.reason);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCapacity();
