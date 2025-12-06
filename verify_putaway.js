const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001';

async function verifyPutaway() {
    try {
        console.log('--- Verifying Putaway Rules ---');

        // 1. Create Product
        const productRes = await fetch(`${API_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Putaway Product ${Date.now()}`,
                sku: `PUT-${Date.now()}`,
                category: 'Putaway Test',
                isStockable: true
            })
        });
        const product = await productRes.json();
        console.log('Created Product:', product.name);

        // 2. Create Locations
        const locRes1 = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Input Zone', type: 'INTERNAL' })
        });
        const inputLoc = await locRes1.json();

        const locRes2 = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Shelf A', type: 'INTERNAL' })
        });
        const shelfA = await locRes2.json();

        const locRes3 = await fetch(`${API_URL}/inventory/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Shelf B', type: 'INTERNAL' })
        });
        const shelfB = await locRes3.json();

        console.log('Created Locations:', inputLoc.name, shelfA.name, shelfB.name);

        // 3. Create Putaway Rules
        // Rule 1: When arriving at Input Zone -> Move to Shelf A (Direct Putaway)
        const ruleRes = await fetch(`${API_URL}/inventory/putaway-rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                locationId: shelfA.id,
                sourceLocationId: inputLoc.id,
                priority: 10
            })
        });
        if (!ruleRes.ok) {
            console.error('Failed to create rule:', await ruleRes.text());
            return;
        }
        console.log('Created Rule 1: Arriving at Input -> Shelf A');

        // Rule 2: Global Rule -> Move to Shelf B (if no specific rule)
        // We'll test this with a different move
        /*
        await fetch(`${API_URL}/inventory/putaway-rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                locationId: shelfB.id,
                sourceLocationId: null,
                priority: 5
            })
        });
        */

        // 4. Test Direct Putaway (Receipt to Input)
        // We simulate a receipt by creating a Stock Move with destination = Input
        // It should be redirected to Shelf A
        const moveRes = await fetch(`${API_URL}/inventory/moves`, { // Assuming this endpoint calls createStockMove
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                quantity: 10,
                destinationLocationId: inputLoc.id,
                type: 'IN', // Assuming API handles this
                // sourceLocationId: null // Vendor
            })
        });

        // Wait, the API endpoint for moves might be different.
        // inventory.controller.ts: @Post('moves') -> createStockMove

        const move = await moveRes.json();
        console.log('Created Stock Move ID:', move.id);
        console.log('Move Destination:', move.destinationLocationId);
        console.log('Expected Destination:', shelfA.id);

        if (move.destinationLocationId === shelfA.id) {
            console.log('SUCCESS: Move redirected to Shelf A!');
        } else {
            console.error('FAILURE: Destination mismatch');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyPutaway();
