

const API_URL = 'http://localhost:3001';

async function verify() {
    console.log('1. Creating Warehouse E (2-step receipt)...');
    const whRes = await fetch(`${API_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Warehouse E',
            shortName: 'WH-E',
            type: 'physical',
            location: { lat: 0, lng: 0 },
            incomingSteps: '2_steps', // Input -> Stock
            outgoingSteps: '1_step'
        })
    });
    const warehouse = await whRes.json();
    console.log('Warehouse created:', warehouse.id);

    // Find Locations
    const locRes = await fetch(`${API_URL}/inventory/locations?warehouseId=${warehouse.id}`);
    const locations = await locRes.json();
    const inputLoc = locations.find(l => l.name === 'Input');
    const stockLoc = locations.find(l => l.name === 'Stock');

    if (!inputLoc || !stockLoc) {
        console.error('FAILED: Missing Input or Stock location');
        return;
    }
    console.log('Locations found:', { input: inputLoc.id, stock: stockLoc.id });

    // 2. Create Product
    console.log('2. Creating Product...');
    const prodRes = await fetch(`${API_URL}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Product Move',
            sku: `TP-${Date.now()}`,
            category: 'Test',
            type: 'product',
            price: 100,
            cost: 50
        })
    });
    const product = await prodRes.json();
    console.log('Product created:', product.id);

    // 3. Create Initial Stock Move (Vendor -> Input)
    console.log('3. Creating Stock Move (Vendor -> Input)...');
    const moveRes = await fetch(`${API_URL}/inventory/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            productId: product.id,
            quantity: 10,
            destinationLocationId: inputLoc.id, // Source null = Vendor
            status: 'DRAFT'
        })
    });
    const move1 = await moveRes.json();
    console.log('Move 1 created:', move1.id);

    // 4. Validate Move 1
    console.log('4. Validating Move 1...');
    const valRes = await fetch(`${API_URL}/inventory/moves/${move1.id}/validate`, {
        method: 'POST'
    });
    const valData = await valRes.json();
    console.log('Move 1 validated:', valData.status);

    // 5. Verify Chained Move (Input -> Stock)
    console.log('5. Verifying Chained Move...');
    // We expect a new move: Source=Input, Dest=Stock, Status=WAITING
    const movesRes = await fetch(`${API_URL}/inventory/moves`);
    const allMoves = await movesRes.json();

    const chainedMove = allMoves.find(m =>
        m.sourceLocationId === inputLoc.id &&
        m.destinationLocationId === stockLoc.id &&
        m.productId === product.id
    );

    if (chainedMove) {
        console.log('SUCCESS: Chained move found:', chainedMove.id);
        console.log('Status:', chainedMove.status);
    } else {
        console.error('FAILED: Chained move not found');
        console.log('All moves:', allMoves);
    }
}

verify().catch(console.error);
