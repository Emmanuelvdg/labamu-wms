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
    console.log('Starting Multi-step Inbound Flow Tests...');

    let supplierId: string;
    let productId: string;
    let warehouseId: string;
    let inputLocationId: string;
    let stockLocationId: string;
    let purchaseOrderId: string;
    let routeId: string;

    // Setup Data
    await runTest('Setup Master Data & Rules', async () => {
        // Create Supplier
        const supplier = await prisma.supplier.create({
            data: { name: 'Multi-step Supplier ' + Date.now() },
        });
        supplierId = supplier.id;

        // Create Product
        const product = await prisma.product.create({
            data: {
                sku: 'MULTI-STEP-PROD-' + Date.now(),
                name: 'Multi-step Product',
                category: 'Test',
            },
        });
        productId = product.id;

        // Create Warehouse
        const warehouse = await prisma.warehouse.create({
            data: { name: 'Multi-step Warehouse', location: '{}', type: 'PHYSICAL' },
        });
        warehouseId = warehouse.id;

        // Create Locations: Input -> Stock
        const inputLoc = await prisma.location.create({
            data: { name: 'Input Zone', type: 'INTERNAL', warehouseId: warehouse.id },
        });
        inputLocationId = inputLoc.id;

        const stockLoc = await prisma.location.create({
            data: { name: 'Stock Zone', type: 'INTERNAL', warehouseId: warehouse.id },
        });
        stockLocationId = stockLoc.id;

        // Create Route & Rule
        const route = await prisma.route.create({
            data: { name: 'Input -> Stock' },
        });
        routeId = route.id;

        await prisma.rule.create({
            data: {
                routeId: route.id,
                action: 'PUSH',
                sourceLocationId: inputLocationId,
                destinationLocationId: stockLocationId,
                sequence: 1,
            },
        });
        console.log('Created Route: Input -> Stock');
    });

    // 1. Create Purchase Order
    await runTest('Create Purchase Order', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                supplierId: supplierId,
                status: 'ORDERED',
                items: {
                    create: [
                        { productId: productId, quantity: 100, unitCost: 20.0 },
                    ],
                },
            },
        });
        purchaseOrderId = po.id;
        console.log('Created PO:', po.id);
    });

    // 2. Receive Goods at Input Location
    await runTest('Receive Goods at Input', async () => {
        // Wait a bit for server
        await new Promise(r => setTimeout(r, 2000));

        const response = await fetch(`http://localhost:3001/purchase-orders/${purchaseOrderId}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationLocationId: inputLocationId }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API call failed: ${response.status} ${text}`);
        }

        const receipt = await response.json() as any;
        console.log('Received Goods at Input, Receipt ID:', receipt.id);
    });

    // 3. Verify Stock Movement (Input -> Stock)
    await runTest('Verify Auto-Push to Stock', async () => {
        // Allow time for async rule processing (though currently it's awaited in controller, but good practice)
        await new Promise(r => setTimeout(r, 1000));

        // Check Input Location (Should be 0 if moved, or 100 if copy? Transfer moves it, so 0)
        // Wait, InventoryService.createTransfer decrements source and increments dest.
        // So Input should be 0, Stock should be 100.

        const inputStock = await prisma.productInventory.findFirst({
            where: { productId: productId, locationId: inputLocationId },
        });
        console.log('Input Stock:', inputStock?.quantity);

        const stockStock = await prisma.productInventory.findFirst({
            where: { productId: productId, locationId: stockLocationId },
        });
        console.log('Stock Stock:', stockStock?.quantity);

        if (stockStock?.quantity !== 100) {
            throw new Error(`Expected 100 units in Stock, found ${stockStock?.quantity}`);
        }

        // Input might be 0 or record might not exist if we don't create 0 records.
        // InventoryService updates existing or creates. If decremented to 0, it stays 0.
        if (inputStock && inputStock.quantity !== 0) {
            throw new Error(`Expected 0 units in Input, found ${inputStock.quantity}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
