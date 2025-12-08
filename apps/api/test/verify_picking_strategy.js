
const API_URL = 'http://localhost:3001';

async function runTest() {
    console.log('Starting API Verification for Picking Strategies...');

    try {
        // 1. Create Product
        console.log('Creating Product...');
        const productRes = await fetch(`${API_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku: `PICK-TEST-${Date.now()}`,
                name: 'Picking Test Widget',
                category: 'Test Category',
                dimensions: '10x10x10'
            })
        });
        if (!productRes.ok) throw new Error(`Failed to create product: ${productRes.statusText}`);
        const product = await productRes.json();
        console.log(`Product created: ${product.name} (${product.id})`);

        // 2. Add Stock (so order can be reserved)
        console.log('Adding Stock...');
        // Need a warehouse/location
        const warehousesRes = await fetch(`${API_URL}/inventory/warehouses`);
        const warehouses = await warehousesRes.json();
        const warehouse = warehouses[0];
        if (!warehouse) throw new Error('No warehouse found');

        const locationsRes = await fetch(`${API_URL}/inventory/locations?warehouseId=${warehouse.id}`);
        const locations = await locationsRes.json();
        const stockLocation = locations.find(l => l.name === 'Stock') || locations[0];

        await fetch(`${API_URL}/inventory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: stockLocation.id,
                quantity: 100,
                costPerUnit: 10,
                purchaseDate: new Date(),
                batchNumber: `BATCH-${Date.now()}`
            })
        });

        // 3. Create Order (Should be RESERVED)
        console.log('Creating Order...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: 'Picking Test Customer',
                priority: 'Normal',
                items: [{ productId: product.id, quantity: 5 }],
                warehouseId: warehouse.id
            })
        });
        if (!orderRes.ok) throw new Error(`Failed to create order: ${orderRes.statusText}`);
        const order = await orderRes.json();
        console.log(`Order created: ${order.id} (Status: ${order.status})`);

        if (order.status !== 'RESERVED') {
            console.warn(`Warning: Order status is ${order.status}, expected RESERVED. Picking strategies might still fail if they strictly look for RESERVED.`);
        }

        // 4. Test Picking Strategies
        console.log('\nTesting Picking Strategies...');

        // Batch
        console.log('Testing Batch Picking...');
        const batchRes = await fetch(`${API_URL}/strategy/picking/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ criteria: 'location', warehouseId: warehouse.id })
        });
        const batchResult = await batchRes.json();
        console.log('Batch Result:', JSON.stringify(batchResult, null, 2));

        const foundInBatch = batchResult.generatedBatches?.some(b => b.orderIds.includes(order.id));
        if (!foundInBatch) throw new Error('Order not found in Batch Picking result');
        console.log('SUCCESS: Order found in Batch Picking.');

        // Cluster
        console.log('Testing Cluster Picking...');
        const clusterRes = await fetch(`${API_URL}/strategy/picking/cluster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ size: 4, warehouseId: warehouse.id })
        });
        const clusterResult = await clusterRes.json();
        console.log('Cluster Result:', JSON.stringify(clusterResult, null, 2));

        const foundInCluster = clusterResult.assignments?.some(a => a.orderId === order.id);
        if (!foundInCluster) throw new Error('Order not found in Cluster Picking result');
        console.log('SUCCESS: Order found in Cluster Picking.');

        // Wave
        console.log('Testing Wave Picking...');
        const waveRes = await fetch(`${API_URL}/strategy/picking/wave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ criteria: 'product', warehouseId: warehouse.id })
        });
        const waveResult = await waveRes.json();
        console.log('Wave Result:', JSON.stringify(waveResult, null, 2));

        const foundInWave = waveResult.pickingList?.some(item => item.orderIds.includes(order.id));
        if (!foundInWave) throw new Error('Order not found in Wave Picking result');
        console.log('SUCCESS: Order found in Wave Picking.');

        console.log('\n--- Picking Strategy Verification Completed Successfully ---');

    } catch (error) {
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
