import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest(name: string, fn: () => Promise<void>) {
    console.log(`\n[TEST] ${name}`);
    try {
        await fn();
        console.log(`[PASS] ${name}`);
    } catch (e) {
        console.error(`[FAIL] ${name}`);
        console.error(e);
    }
}

async function main() {
    console.log('Starting Inbound Flow Tests...');

    let supplierId: string;
    let productId: string;
    let warehouseId: string;
    let locationId: string;
    let purchaseOrderId: string;

    // Setup Data
    await runTest('Setup Master Data', async () => {
        // Create Supplier
        const supplier = await prisma.supplier.create({
            data: { name: 'Test Supplier ' + Date.now() },
        });
        supplierId = supplier.id;
        console.log('Created Supplier:', supplier.name);

        // Create Product
        const product = await prisma.product.create({
            data: {
                sku: 'INBOUND-PROD-' + Date.now(),
                name: 'Inbound Product',
                category: 'Test',
            },
        });
        productId = product.id;
        console.log('Created Product:', product.name);

        // Create Warehouse & Location
        const warehouse = await prisma.warehouse.create({
            data: {
                name: 'Inbound Warehouse',
                location: '{}',
                type: 'PHYSICAL',
            },
        });
        warehouseId = warehouse.id;

        const location = await prisma.location.create({
            data: {
                name: 'Receiving Dock',
                type: 'INTERNAL',
                warehouseId: warehouse.id,
            },
        });
        locationId = location.id;
        console.log('Created Warehouse & Location');
    });

    // 1. Create Purchase Order
    await runTest('Create Purchase Order', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                supplierId: supplierId,
                status: 'ORDERED',
                items: {
                    create: [
                        { productId: productId, quantity: 50, unitCost: 10.5 },
                    ],
                },
            },
        });
        purchaseOrderId = po.id;
        console.log('Created PO:', po.id);
    });

    // 2. Receive Goods (Simulate Service Logic via API call or direct DB manipulation mimicking service)
    // Since we can't easily call the service method directly from this script without Nest context,
    // we will use `fetch` to call the API endpoint if running, OR replicate the service logic here.
    // Given the backend is restarting/running, let's try to call the API.

    await runTest('Receive Goods via API', async () => {
        // Wait a bit for server to be ready
        await new Promise(r => setTimeout(r, 2000));

        const response = await fetch(`http://localhost:3001/purchase-orders/${purchaseOrderId}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationLocationId: locationId }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API call failed: ${response.status} ${text}`);
        }

        const receipt = await response.json() as any;
        console.log('Received Goods, Receipt ID:', receipt.id);
    });

    // 3. Verify Stock
    await runTest('Verify Stock Increase', async () => {
        const inventory = await prisma.productInventory.findFirst({
            where: { productId: productId, locationId: locationId },
        });

        if (!inventory || inventory.quantity !== 50) {
            throw new Error(`Expected 50 units, found ${inventory?.quantity}`);
        }
        console.log('Stock Verified: 50 units');

        const batch = await prisma.inventoryBatch.findFirst({
            where: { productId: productId, locationId: locationId },
        });
        if (!batch) throw new Error('Batch not created');
        console.log('Batch Verified:', batch.batchNumber);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
