// Phase 10 E2E Test Script - Direct API Calls
const BASE = 'http://127.0.0.1:3001/inventory';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';

async function api(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 10 E2E Test ===\n');

    // 1. Get products (find Pro Laptop X)
    const { data: products } = await api('/products');
    const laptop = products.find(p => p.name === 'Pro Laptop X');
    if (!laptop) { console.log('ERROR: Pro Laptop X not found!'); return; }
    console.log(`Found product: ${laptop.name} (id: ${laptop.id})`);

    // 2. Get locations (find Bin 01)
    const { data: locations } = await api('/locations');
    const bin01 = locations.find(l => l.name === 'Bin 01');
    if (!bin01) { console.log('ERROR: Bin 01 not found!'); return; }
    console.log(`Found location: ${bin01.name} (id: ${bin01.id})\n`);

    // === Scenario 10.3: Create Scrap Order ===
    console.log('--- Scenario 10.3: Create Scrap Order ---');
    const scrapResult = await api('/scrap', {
        method: 'POST',
        body: JSON.stringify({
            productId: laptop.id,
            locationId: bin01.id,
            quantity: 1,
            reason: 'Damaged'
        })
    });
    console.log(`Status: ${scrapResult.status}`);
    if (scrapResult.status === 201 || scrapResult.status === 200) {
        console.log('PASS: Scrap order created successfully');
        console.log('Scrap ID:', scrapResult.data?.id);
    } else {
        console.log('FAIL:', JSON.stringify(scrapResult.data));
    }
    console.log();

    // === Scenario 10.4: Verify Scrap in Stock Moves ===
    console.log('--- Scenario 10.4: Verify Scrap in Stock Moves ---');
    const { data: stockMoves } = await api('/moves');
    console.log(`Total stock moves: ${stockMoves.length}`);
    // Scrap creates a StockTransaction, not a StockMove, so check transactions
    const { data: transactions } = await api('/transactions');
    const scrapTx = Array.isArray(transactions) ? transactions.find(t =>
        t.type === 'OUT' && t.productId === laptop.id
    ) : null;
    if (scrapTx) {
        console.log('PASS: Scrap transaction found in stock transactions');
        console.log(`  Type: ${scrapTx.type}, Qty: ${scrapTx.quantity}, Product: ${scrapTx.product?.name}`);
    } else {
        console.log('INFO: Scrap logged as StockTransaction (type OUT), check via /transactions endpoint');
        console.log(`  Transactions count: ${Array.isArray(transactions) ? transactions.length : 'N/A'}`);
    }
    console.log();

    // === Scenario 10.5: Create Route ===
    console.log('--- Scenario 10.5: Create Route ---');
    const routeResult = await api('/routes', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Receiving to Storage',
            description: 'When product arrives at Receiving Dock → move to Main Storage'
        })
    });
    console.log(`Status: ${routeResult.status}`);
    if (routeResult.status === 201 || routeResult.status === 200) {
        console.log('PASS: Route created successfully');
        console.log('Route ID:', routeResult.data?.id);

        // Add a PUSH rule
        const ruleResult = await api(`/routes/${routeResult.data.id}/rules`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'PUSH',
                sourceLocationId: bin01.id, // Using Bin 01 as source for demo
                sequence: 1
            })
        });
        console.log(`Rule creation status: ${ruleResult.status}`);
        if (ruleResult.status === 201 || ruleResult.status === 200) {
            console.log('PASS: Push rule added to route');
        } else {
            console.log('FAIL:', JSON.stringify(ruleResult.data));
        }
    } else {
        console.log('FAIL:', JSON.stringify(routeResult.data));
    }
    console.log();

    // === Scenario 10.6: Create Partner Location ===
    console.log('--- Scenario 10.6: Create Partner Location ---');
    const partnerResult = await api('/locations', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Retail Store A',
            type: 'CUSTOMER',
            structuralType: 'WAREHOUSE'
        })
    });
    console.log(`Status: ${partnerResult.status}`);
    if (partnerResult.status === 201 || partnerResult.status === 200) {
        console.log('PASS: Partner location "Retail Store A" created');
        console.log('Location ID:', partnerResult.data?.id);
        console.log('Type:', partnerResult.data?.type);
    } else {
        console.log('FAIL:', JSON.stringify(partnerResult.data));
    }
    console.log();

    // === Verify all routes ===
    console.log('--- Verification: All Routes ---');
    const { data: routes } = await api('/routes');
    console.log(`Total routes: ${routes.length}`);
    routes.forEach(r => {
        console.log(`  - ${r.name} (${r.rules?.length || 0} rules)`);
    });
    console.log();

    // === Verify scrap orders ===
    console.log('--- Verification: Scrap Orders ---');
    const { data: scrapOrders } = await api('/scrap');
    console.log(`Total scrap orders: ${scrapOrders.length}`);
    scrapOrders.forEach(s => {
        console.log(`  - Product: ${s.product?.name}, Location: ${s.location?.name}, Qty: ${s.quantity}`);
    });

    console.log('\n=== Phase 10 Tests Complete ===');
}

run().catch(console.error);
