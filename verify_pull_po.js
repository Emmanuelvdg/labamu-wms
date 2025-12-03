
const API_URL = 'http://127.0.0.1:3001';

async function verify() {
    console.log('1. Creating Warehouse F (3-step receipt)...');
    const whRes = await fetch(`${API_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Warehouse F',
            shortName: 'WH-F',
            type: 'physical',
            location: { lat: 0, lng: 0 },
            incomingSteps: '3_steps', // Input -> Quality -> Stock
            outgoingSteps: '1_step'
        })
    });
    const warehouse = await whRes.json();
    console.log('Warehouse created:', warehouse.id);

    const locRes = await fetch(`${API_URL}/inventory/locations?warehouseId=${warehouse.id}`);
    const locations = await locRes.json();
    const inputLoc = locations.find(l => l.name === 'Input');
    const qualityLoc = locations.find(l => l.name === 'Quality Control');
    const stockLoc = locations.find(l => l.name === 'Stock');

    if (!inputLoc || !qualityLoc || !stockLoc) {
        console.error('FAILED: Missing locations');
        return;
    }
    console.log('Locations:', { input: inputLoc.id, quality: qualityLoc.id, stock: stockLoc.id });

    // 2. Create Product
    console.log('2. Creating Product...');
    const prodRes = await fetch(`${API_URL}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Pull Test Product',
            sku: `PULL-${Date.now()}`,
            category: 'Test',
            type: 'product',
            price: 100,
            cost: 50
        })
    });
    const product = await prodRes.json();
    console.log('Product created:', product.id);

    // 3. Create Supplier
    console.log('3. Creating Supplier...');
    const supRes = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Supplier ${Date.now()}` })
    });
    const supplier = await supRes.json();

    // 4. Create PO (Should trigger Vendor -> Input move)
    console.log('4. Creating PO...');
    const poRes = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            supplierId: supplier.id,
            items: [{ productId: product.id, quantity: 50, unitCost: 10 }],
            destinationLocationId: inputLoc.id
        })
    });
    const po = await poRes.json();
    const fs = require('fs');
    fs.writeFileSync('po_response.json', JSON.stringify(po, null, 2));
    console.log('PO created:', po.id);

    // Verify Stock Move (Vendor -> Input)
    const movesRes = await fetch(`${API_URL}/inventory/moves`);
    const allMoves = await movesRes.json();
    const poMove = allMoves.find(m =>
        m.origin === po.id &&
        m.destinationLocationId === inputLoc.id
    );

    if (poMove) {
        console.log('SUCCESS: PO Stock Move created:', poMove.id);
    } else {
        console.error('FAILED: PO Stock Move not found');
    }

    // 5. Validate PO Move (Vendor -> Input) -> Should trigger Input -> Quality (Push)
    if (poMove) {
        console.log('5. Validating PO Move...');
        await fetch(`${API_URL}/inventory/moves/${poMove.id}/validate`, { method: 'POST' });

        // Check for chained move (Input -> Quality)
        const movesRes2 = await fetch(`${API_URL}/inventory/moves`);
        const allMoves2 = await movesRes2.json();
        const pushMove = allMoves2.find(m =>
            m.sourceLocationId === inputLoc.id &&
            m.destinationLocationId === qualityLoc.id &&
            m.productId === product.id
        );

        if (pushMove) {
            console.log('SUCCESS: Push Move (Input -> Quality) created:', pushMove.id);
        } else {
            console.error('FAILED: Push Move not found');
        }
    }

    // 6. Test Pull Rule
    // Create a Pull Rule: Pull from Quality to Stock (to simulate demand at Stock pulling from Quality)
    // Actually, normally we have Push rules for incoming. 
    // Let's create a Pull Rule: Stock needs item, Pull from Quality.
    console.log('6. Creating Pull Rule (Stock pulls from Quality)...');
    // First, find the route or create one. Let's just create a rule on the "Deliver" route or a new one.
    // We'll create a standalone rule for simplicity.
    // Wait, createRule endpoint requires a routeId.
    const routeRes = await fetch(`${API_URL}/inventory/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Pull Route' })
    });
    const route = await routeRes.json();

    await fetch(`${API_URL}/inventory/routes/${route.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'PULL',
            sourceLocationId: qualityLoc.id,
            destinationLocationId: stockLoc.id,
            sequence: 1
        })
    });

    // Now create a demand at Stock (e.g. Move Stock -> Customer)
    console.log('7. Creating Demand at Stock (Stock -> Customer)...');
    const demandMoveRes = await fetch(`${API_URL}/inventory/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            productId: product.id,
            quantity: 5,
            sourceLocationId: stockLoc.id,
            destinationLocationId: null, // Customer
            status: 'WAITING'
        })
    });
    const demandMove = await demandMoveRes.json();
    console.log('Demand Move created:', demandMove.id);

    // This should have triggered checkProcurement -> Found Pull Rule -> Create Move Quality -> Stock
    const movesRes3 = await fetch(`${API_URL}/inventory/moves`);
    const allMoves3 = await movesRes3.json();
    const pullMove = allMoves3.find(m =>
        m.sourceLocationId === qualityLoc.id &&
        m.destinationLocationId === stockLoc.id &&
        m.productId === product.id &&
        m.status === 'WAITING'
    );

    if (pullMove) {
        console.log('SUCCESS: Pull Move (Quality -> Stock) created:', pullMove.id);
    } else {
        console.error('FAILED: Pull Move not found');
    }
}

verify().catch(console.error);
