
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function checkE2EState() {
    console.log('Checking E2E State...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    try {
        console.log('\n--- Phase 1: Infrastructure ---');
        const dc1 = await prisma.warehouse.findFirst({ where: { shortName: 'DC1' } });
        console.log(`[${dc1 ? 'x' : ' '}] Warehouse DC1`);

        if (dc1) {
            const receiving = await prisma.location.findFirst({ where: { warehouseId: dc1.id, name: 'Receiving Dock 1' } });
            console.log(`[${receiving ? 'x' : ' '}] Location: Receiving Dock 1`);

            const zoneA = await prisma.location.findFirst({ where: { warehouseId: dc1.id, name: 'Zone A' } });
            if (zoneA) {
                console.log(`[x] Location: Zone A`);
                const row1 = await prisma.location.findFirst({ where: { parentId: zoneA.id, name: 'Row 1' } });
                if (row1) {
                    console.log(`[x] Location: Row 1`);
                    const shelf1 = await prisma.location.findFirst({ where: { parentId: row1.id, name: 'Shelf 1' } });
                    if (shelf1) {
                        console.log(`[x] Location: Shelf 1`);
                        const bin01 = await prisma.location.findFirst({ where: { parentId: shelf1.id, name: 'Bin 01' } });
                        console.log(`[${bin01 ? 'x' : ' '}] Location: Bin 01`);
                    } else {
                        console.log(`[ ] Location: Shelf 1`);
                    }
                } else {
                    console.log(`[ ] Location: Row 1`);
                }
            } else {
                console.log(`[ ] Location: Zone A`);
            }
        }

        console.log('\n--- Phase 2: Catalog ---');
        const category = await prisma.category.findFirst({ where: { name: 'Electronics' } });
        console.log(`[${category ? 'x' : ' '}] Category: Electronics`);

        const attribute = await prisma.locationAttributeDefinition.findFirst({ where: { name: 'Serial Number' } });
        console.log(`[${attribute ? 'x' : ' '}] Attribute: Serial Number`);

        const supplier = await prisma.supplier.findFirst({ where: { name: 'TechSupplier Inc' } });
        console.log(`[${supplier ? 'x' : ' '}] Supplier: TechSupplier Inc`);

        const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } });
        console.log(`[${product ? 'x' : ' '}] Product: Pro Laptop X (LAP-X)`);

        console.log('\n--- Phase 3: Inbound ---');
        const po = await prisma.purchaseOrder.findFirst({
            where: {
                supplier: { name: 'TechSupplier Inc' },
                items: { some: { product: { sku: 'LAP-X' } } }
            }
        });
        console.log(`[${po ? 'x' : ' '}] Purchase Order for LAP-X`);
        if (po) {
            console.log(`    Status: ${po.status}`);
        }

        console.log('\n--- Phase 4: Outbound ---');
        const customer = await prisma.customer.findFirst({ where: { name: 'Corporate Client A' } });
        console.log(`[${customer ? 'x' : ' '}] Customer: Corporate Client A`);

        const so = await prisma.order.findFirst({
            where: {
                customer: { name: 'Corporate Client A' },
                items: { some: { product: { sku: 'LAP-X' } } }
            }
        });
        console.log(`[${so ? 'x' : ' '}] Sales Order for LAP-X`);

    } catch (e) {
        console.error('Error checking state:', e);
    } finally {
        await app.close();
    }
}

checkE2EState();
