// const fetch = require('node-fetch'); // Using native fetch

const API_URL = 'http://127.0.0.1:3001';

async function run() {
    try {
        // 1. Create Product
        console.log('1. Creating Product...');
        const productRes = await fetch(`${API_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku: `SCRAP-TEST-${Date.now()}`,
                name: 'Scrap Test Product',
                category: 'Test',
                type: 'storable',
                unitOfMeasure: 'Unit',
                averageCost: 10,
                status: 'Active'
            })
        });
        console.log('Product Create Status:', productRes.status);
        if (!productRes.ok) {
            console.log('Product Create Error:', await productRes.text());
            return;
        }
        const product = await productRes.json();
        console.log('Product created:', product.id);

        // 2. Get Warehouse/Location
        console.log('2. Fetching Warehouses...');
        const whRes = await fetch(`${API_URL}/inventory/warehouses`);
        console.log('Warehouse Fetch Status:', whRes.status);
        if (!whRes.ok) {
            console.log('Warehouse Fetch Error:', await whRes.text());
            return;
        }
        const warehouses = await whRes.json();
        if (!warehouses || warehouses.length === 0) {
            throw new Error('No warehouses found');
        }
        const warehouse = warehouses[0];
        console.log('Warehouse:', warehouse.name, warehouse.id);

        console.log('Fetching Locations...');
        const locRes = await fetch(`${API_URL}/inventory/locations?warehouseId=${warehouse.id}`);
        console.log('Location Fetch Status:', locRes.status);
        if (!locRes.ok) {
            console.log('Location Fetch Error:', await locRes.text());
            return;
        }
        const locations = await locRes.json();
        console.log('Locations found:', locations.length);

        const stockLocation = locations.find(l => l.name === 'Stock' || l.type === 'internal')?.id || locations[0]?.id;

        if (!stockLocation) {
            throw new Error('No valid location found');
        }
        console.log('Using Location:', stockLocation);

        // 3. Add Stock
        console.log('3. Adding Stock...');
        const batchRes = await fetch(`${API_URL}/inventory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: stockLocation,
                quantity: 10,
                costPerUnit: 10,
                purchaseDate: new Date().toISOString()
            })
        });
        console.log('Batch Create Status:', batchRes.status);
        if (!batchRes.ok) {
            console.log('Batch Create Error:', await batchRes.text());
            return;
        }

        // 4. Create Scrap Order (Validate)
        console.log('4. Creating Scrap Order...');
        const scrapRes = await fetch(`${API_URL}/inventory/scrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                locationId: stockLocation,
                quantity: 5,
                reason: 'Damaged'
            })
        });

        console.log('Scrap Create Status:', scrapRes.status);
        if (scrapRes.status !== 201) {
            const err = await scrapRes.text();
            console.error('FAILED to create scrap order:', scrapRes.status, err);
        } else {
            const scrap = await scrapRes.json();
            console.log('SUCCESS: Scrap Order created:', scrap.id);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
