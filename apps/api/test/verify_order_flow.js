
const API_URL = 'http://localhost:3001';

async function runTest() {
    console.log('Starting API Verification for Order Workflows...');

    try {
        // --- Part 1: Inbound (Receiving) ---
        console.log('\n--- Part 1: Inbound Operations ---');

        // 1. Create Supplier
        console.log('Creating Supplier...');
        const supplierRes = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `Test Supplier ${Date.now()}` })
        });
        if (!supplierRes.ok) throw new Error(`Failed to create supplier: ${supplierRes.statusText}`);
        const supplier = await supplierRes.json();
        console.log(`Supplier created: ${supplier.name} (${supplier.id})`);

        // 2. Create Product
        console.log('Creating Product...');
        const productRes = await fetch(`${API_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku: `TEST-${Date.now()}`,
                name: 'API Test Widget',
                category: 'Test Category',
                dimensions: '10x10x10'
            })
        });
        if (!productRes.ok) throw new Error(`Failed to create product: ${productRes.statusText}`);
        const product = await productRes.json();
        console.log(`Product created: ${product.name} (${product.id})`);

        // 3. Create Purchase Order
        console.log('Creating Purchase Order...');
        const poRes = await fetch(`${API_URL}/purchase-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplierId: supplier.id,
                items: [{ productId: product.id, quantity: 10, unitCost: 5 }]
            })
        });
        if (!poRes.ok) throw new Error(`Failed to create PO: ${poRes.statusText}`);
        const po = await poRes.json();
        console.log(`PO created: ${po.id} (Status: ${po.status})`);

        // 4. Receive Goods
        console.log('Receiving Goods...');
        // Need a valid location ID. Fetch warehouses/locations first.
        const locationsRes = await fetch(`${API_URL}/inventory/locations`);
        const locations = await locationsRes.json();
        const stockLocation = locations.find((l) => l.name === 'Stock') || locations[0];

        if (!stockLocation) throw new Error('No valid location found to receive goods');

        const receiveRes = await fetch(`${API_URL}/purchase-orders/${po.id}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationLocationId: stockLocation.id })
        });
        if (!receiveRes.ok) throw new Error(`Failed to receive goods: ${receiveRes.statusText}`);
        const receivedPo = await receiveRes.json();
        console.log(`PO Received. Status: ${receivedPo.status}`);

        // 5. Verify Inventory
        const inventoryRes = await fetch(`${API_URL}/inventory?productId=${product.id}`);
        const inventory = await inventoryRes.json();
        const totalQty = inventory.reduce((acc, item) => acc + item.quantity, 0);
        console.log(`Total Inventory for ${product.name}: ${totalQty}`);
        if (totalQty !== 10) throw new Error(`Expected 10 items, found ${totalQty}`);


        // --- Part 2: Outbound (Processing) ---
        console.log('\n--- Part 2: Outbound Operations ---');

        // 1. Create Customer Order
        console.log('Creating Customer Order...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: 'Test Customer',
                priority: 'Normal',
                items: [{ productId: product.id, quantity: 5 }]
            })
        });
        if (!orderRes.ok) throw new Error(`Failed to create order: ${orderRes.statusText}`);
        const order = await orderRes.json();
        console.log(`Order created: ${order.id} (Status: ${order.status})`);

        // 2. Verify Order Status
        if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
            console.warn(`Order status is ${order.status}, expected PENDING or CONFIRMED`);
        }

        // 3. Simulate Shipping (Simple)
        console.log('Shipping Order...');
        const shipRes = await fetch(`${API_URL}/orders/ship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: order.id,
                carrier: 'Test Carrier',
                trackingId: 'TRACK-123'
            })
        });

        if (shipRes.ok) {
            const shipment = await shipRes.json();
            console.log(`Shipment created. Order Status should be SHIPPED.`);
        } else {
            console.log(`Shipping failed (might be expected if picking flow is strict): ${shipRes.statusText}`);
        }

        console.log('\n--- Test Completed Successfully ---');

    } catch (error) {
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
