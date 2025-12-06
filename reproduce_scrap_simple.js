// const fetch = require('node-fetch'); // Native fetch

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
        if (!productRes.ok) throw new Error(await productRes.text());
        const product = await productRes.json();
        console.log('Product created:', product.id);

        // 2. Create Location
        console.log('2. Creating Location...');
        // We need a parent location (Warehouse) first? Or just a root location?
        // Let's try to get a warehouse first to use as parent, or just create a root location if allowed.
        // Actually, let's just pick the first warehouse's location.
        const whRes = await fetch(`${API_URL}/inventory/warehouses`);
        const warehouses = await whRes.json();
        if (!warehouses.length) throw new Error('No warehouses');
        const warehouse = warehouses[0];

        // Create a child location "Scrap Test Location"
        const locRes = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Scrap Test Loc ${Date.now()}`,
                parentId: warehouse.locationId,
                type: 'internal',
                warehouseId: warehouse.id
            })
        });
        if (!locRes.ok) throw new Error('Failed to create location: ' + await locRes.text());
        const location = await locRes.json();
        console.log('Location created:', location.id);

        // 3. Add Stock
        console.log('3. Adding Stock...');
        const batchRes = await fetch(`${API_URL}/inventory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: location.id,
                quantity: 10,
                costPerUnit: 10,
                purchaseDate: new Date().toISOString()
            })
        });
        if (!batchRes.ok) throw new Error('Failed to add batch: ' + await batchRes.text());
        console.log('Stock added');

        // 4. Create Scrap Order
        console.log('4. Creating Scrap Order...');
        const scrapRes = await fetch(`${API_URL}/inventory/scrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                locationId: location.id,
                quantity: 5,
                reason: 'Damaged'
            })
        });

        console.log('Scrap Status:', scrapRes.status);
        if (!scrapRes.ok) {
            console.log('Scrap Error:', await scrapRes.text());
        } else {
            const scrap = await scrapRes.json();
            console.log('SUCCESS: Scrap Order created:', scrap.id);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
