const API = 'http://127.0.0.1:3001/inventory';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';

async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 10 Adjustments ===\n');

    // 1. Get products (find Pro Laptop X)
    const { data: products } = await api('/products');
    const laptop = products.find(p => p.name === 'Pro Laptop X' || p.sku === 'LAP-X');

    // 2. Get locations (find Bin 01)
    const { data: locations } = await api('/locations');
    const bin01 = locations.find(l => l.name === 'Bin 01');

    if (!laptop || !bin01) {
        console.error('Missing product or location');
        return;
    }

    // Scenario 10.1: Create Inventory Adjustment (Relative)
    console.log('--- Scenario 10.1: Create Inventory Adjustment (Relative) ---');
    const adjResult = await api('/adjustments', {
        method: 'POST',
        body: JSON.stringify({
            productId: laptop.id,
            locationId: bin01.id,
            type: 'RELATIVE',
            quantity: 2,
            reason: 'Found Stock'
        })
    });
    console.log(`Status: ${adjResult.status}`);
    if (adjResult.status === 201 || adjResult.status === 200) {
        console.log('PASS: Adjustment created');
        console.log(JSON.stringify(adjResult.data));
    } else {
        console.log('FAIL:', JSON.stringify(adjResult.data));
    }
    console.log();

    // Scenario 10.2: Verify Adjustment in Ledger
    console.log('--- Scenario 10.2: Verify Adjustment in Ledger ---');
    const ledgerResult = await api('/transactions');
    if (Array.isArray(ledgerResult.data)) {
        const found = ledgerResult.data.find(t => t.type === 'ADJUSTMENT' && t.productId === laptop.id && t.quantity === 2);
        if (found) {
            console.log('PASS: Adjustment found in transactions');
        } else {
            console.log('FAIL: Adjustment not found in transactions');
            console.log('Recent transactions:', JSON.stringify(ledgerResult.data.slice(0, 5)));
        }
    } else {
        console.log('FAIL: Could not fetch transactions');
    }
}

run();
