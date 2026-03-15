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
    console.log('=== Phase 10 Adjustments (Corrected) ===\n');

    const { data: products } = await api('/products');
    const laptop = products.find(p => p.sku === 'LAP-X');
    const { data: locations } = await api('/locations');
    const bin01 = locations.find(l => l.name === 'Bin 01');

    if (!laptop || !bin01) {
        console.error('Missing product or location');
        return;
    }

    // 1. Get current stock
    const invRes = await api(`?productId=${laptop.id}&locationId=${bin01.id}`);
    let currentQty = 0;
    if (Array.isArray(invRes.data) && invRes.data.length > 0) {
        currentQty = invRes.data[0].quantity;
    }
    console.log(`Current stock at Bin 01: ${currentQty}`);

    // 2. Scenario 10.1: Create & Apply Adjustment
    console.log('--- Scenario 10.1: Create & Apply Adjustment (+2) ---');
    const adjResult = await api('/adjustments', {
        method: 'POST',
        body: JSON.stringify({
            productId: laptop.id,
            locationId: bin01.id,
            currentQuantity: currentQty,
            countedQuantity: currentQty + 2,
            status: 'APPLIED',
            reason: 'Found Stock'
        })
    });
    console.log(`Status: ${adjResult.status}`);
    if (adjResult.status === 201 || adjResult.status === 200) {
        console.log('PASS: Adjustment created and applied');
    } else {
        console.log('FAIL:', JSON.stringify(adjResult.data));
    }
    console.log();

    // 3. Scenario 10.2: Verify in transactions
    console.log('--- Scenario 10.2: Verify in transactions ---');
    const txRes = await api(`/transactions/${laptop.id}`);
    if (Array.isArray(txRes.data)) {
        const found = txRes.data.find(t => t.type === 'ADJUSTMENT' && t.quantity === 2);
        if (found) {
            console.log('PASS: Adjustment transaction found');
        } else {
            console.log('FAIL: Adjustment transaction not found');
        }
    }
}

run();
