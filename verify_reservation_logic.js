const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001';

async function verifyReservationLogic() {
    try {
        console.log('--- Verifying Reservation Logic ---');

        // 1. Setup: Create Product and Stock
        const productRes = await fetch(`${API_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku: `RES-TEST-${Date.now()}`,
                name: 'Reservation Test Product',
                category: 'Test',
                isStockable: true
            })
        });
        const product = await productRes.json();
        console.log('Created Product:', product.sku);

        const warehouseRes = await fetch(`${API_URL}/inventory/warehouses`);
        if (!warehouseRes.ok) {
            console.error('Failed to fetch warehouses:', await warehouseRes.text());
            return;
        }
        const warehouses = await warehouseRes.json();
        let warehouseId;
        if (!warehouses || warehouses.length === 0) {
            console.log('No warehouses found, creating one...');
            const createWhRes = await fetch(`${API_URL}/inventory/warehouses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Warehouse',
                    shortName: 'TW',
                    address: '123 Test St',
                    type: 'PHYSICAL',
                    location: { lat: 0, lng: 0 }
                })
            });
            const newWh = await createWhRes.json();
            warehouseId = newWh.id;
            console.log('Created Warehouse:', warehouseId);
        } else {
            warehouseId = warehouses[0].id;
        }

        // Get Location
        const locationsRes = await fetch(`${API_URL}/inventory/locations?warehouseId=${warehouseId}`);
        const locations = await locationsRes.json();
        const locationId = locations.find(l => l.type !== 'VIEW')?.id || locations[0].id;

        // 3. Add Stock (using Adjustment)
        const adjustRes = await fetch(`${API_URL}/inventory/adjustments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                locationId: locationId,
                productId: product.id,
                countedQuantity: 100,
                currentQuantity: 0,
                reason: 'Initial Stock',
                status: 'APPLIED'
            })
        });
        const adjustData = await adjustRes.json();
        if (!adjustRes.ok) {
            console.error('Failed to add stock:', adjustData);
            process.exit(1);
        }
        console.log('Added Stock: 100 (Adjustment Applied)', adjustData.id);

        // Verify Inventory Exists
        const invRes = await fetch(`${API_URL}/inventory?productId=${product.id}`);
        const invData = await invRes.json();
        console.log('Current Inventory:', JSON.stringify(invData, null, 2));

        // Helper to set active strategy
        async function setStrategy(name, rules) {
            // Deactivate all existing
            const strategiesRes = await fetch(`${API_URL}/strategy/reservation`);
            const strategies = await strategiesRes.json();
            for (const s of strategies) {
                if (s.active) {
                    await fetch(`${API_URL}/strategy/reservation/${s.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: false })
                    });
                }
            }

            // Create new active one
            const createRes = await fetch(`${API_URL}/strategy/reservation/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    rules: JSON.stringify(rules)
                })
            });
            return createRes.json();
        }

        // Helper to create order
        async function createOrder(expectedDate) {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: 'CUST-001',
                    priority: 'NORMAL',
                    expectedDate: expectedDate,
                    items: [{ productId: product.id, quantity: 10 }]
                })
            });
            return res.json();
        }

        // Scenario 1: Manual
        console.log('\n--- Scenario 1: Manual ---');
        await setStrategy('Manual Strategy', { method: 'manually' });
        const order1 = await createOrder();
        console.log('Order 1 Status:', order1.status);
        if (order1.status === 'PENDING') console.log('SUCCESS: Order is PENDING');
        else console.error('FAILURE: Order should be PENDING');

        // Scenario 2: At Confirmation
        console.log('\n--- Scenario 2: At Confirmation ---');
        await setStrategy('Confirmation Strategy', { method: 'at_confirmation' });
        const order2 = await createOrder();
        console.log('Order 2 Status:', order2.status);
        if (order2.status === 'RESERVED') console.log('SUCCESS: Order is RESERVED');
        else console.error('FAILURE: Order should be RESERVED');

        // Scenario 3: Before Date (Future)
        console.log('\n--- Scenario 3: Before Date (Future) ---');
        await setStrategy('Before Date Strategy', { method: 'before_date', daysBefore: 5 });
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10); // 10 days from now
        const order3 = await createOrder(futureDate.toISOString());
        console.log('Order 3 Status:', order3.status);
        if (order3.status === 'PENDING') console.log('SUCCESS: Order is PENDING (Too early)');
        else console.error('FAILURE: Order should be PENDING');

        // Scenario 4: Before Date (Now)
        console.log('\n--- Scenario 4: Before Date (Now) ---');
        // Strategy already set
        const nearDate = new Date();
        nearDate.setDate(nearDate.getDate() + 2); // 2 days from now (Reservation date was 3 days ago)
        const order4 = await createOrder(nearDate.toISOString());
        console.log('Order 4 Status:', order4.status);
        if (order4.status === 'RESERVED') console.log('SUCCESS: Order is RESERVED (Time to reserve)');
        else console.error('FAILURE: Order should be RESERVED');

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyReservationLogic();
