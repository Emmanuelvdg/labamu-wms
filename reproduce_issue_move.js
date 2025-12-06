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
                sku: `MOVE-TEST-${Date.now()}`,
                name: 'Move Test Product',
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

        // 2. Create Locations (Source and Dest)
        console.log('2. Creating Locations...');
        const whRes = await fetch(`${API_URL}/inventory/warehouses`);
        const warehouses = await whRes.json();
        if (!warehouses.length) throw new Error('No warehouses');
        const warehouse = warehouses[0];

        const locRes1 = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `Loc A ${Date.now()}`, parentId: warehouse.locationId, type: 'internal', warehouseId: warehouse.id })
        });
        const locA = await locRes1.json();

        const locRes2 = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `Loc B ${Date.now()}`, parentId: warehouse.locationId, type: 'internal', warehouseId: warehouse.id })
        });
        const locB = await locRes2.json();
        console.log('Locations:', locA.id, '->', locB.id);

        // 3. Add Stock to Loc A
        console.log('3. Adding Stock to Loc A...');
        await fetch(`${API_URL}/inventory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                warehouseId: warehouse.id,
                locationId: locA.id,
                quantity: 10,
                costPerUnit: 10,
                purchaseDate: new Date().toISOString()
            })
        });

        // 4. Move Stock from Loc A to Loc B
        console.log('4. Moving Stock (Loc A -> Loc B)...');
        const moveRes = await fetch(`${API_URL}/inventory/moves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                sourceLocationId: locA.id,
                destinationLocationId: locB.id,
                quantity: 10,
                status: 'DRAFT'
            })
        });
        const move = await moveRes.json();
        console.log('Move created:', move.id);

        // 5. Validate Move
        console.log('5. Validating Move...');
        const valRes = await fetch(`${API_URL}/inventory/moves/${move.id}/validate`, {
            method: 'POST'
        });
        if (!valRes.ok) throw new Error('Failed to validate move: ' + await valRes.text());
        console.log('Move validated');

        // 6. Create Scrap Order from Loc B
        console.log('6. Creating Scrap Order from Loc B...');
        const scrapRes = await fetch(`${API_URL}/inventory/scrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                locationId: locB.id,
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
