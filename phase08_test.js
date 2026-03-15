const API = 'http://127.0.0.1:3001';
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
    console.log('=== Phase 8 Live Integrations (Lalamove) ===\n');

    try {
        // We'll try to find a warehouse and its lalamove config
        const { data: warehouses } = await api('/inventory/warehouses');
        if (!Array.isArray(warehouses) || warehouses.length === 0) {
            console.log('No warehouses found');
            return;
        }
        const whId = warehouses[0].id;
        console.log(`Checking Lalamove config for Warehouse: ${warehouses[0].name} (${whId})`);

        // Get config
        const configRes = await api(`/lalamove/config/${whId}`);
        console.log(`Config API status: ${configRes.status}`);
        if (configRes.status === 200) {
            console.log('PASS: Lalamove config endpoint accessible');
            console.log('Data:', JSON.stringify(configRes.data));
        } else {
            console.log('INFO: Lalamove config not found or error (expected if not set up)');
        }

        // Scenario 8.1: Live Quote
        console.log('\n--- Scenario 8.1: Live Quote ---');
        const quoteRes = await api('/lalamove/quote', {
            method: 'POST',
            body: JSON.stringify({
                warehouseId: whId,
                destination: 'Thamrin City, Jakarta',
                items: [{ sku: 'LAP-X', quantity: 1, weight: 2.5 }]
            })
        });
        console.log(`Quote status: ${quoteRes.status}`);
        if (quoteRes.status === 200 || quoteRes.status === 201) {
            console.log('PASS: Quote returned successfully');
            console.log('Quote:', JSON.stringify(quoteRes.data));
        } else if (quoteRes.status === 400 || quoteRes.status === 500) {
            console.log(`GRACEFUL FAILURE: ${JSON.stringify(quoteRes.data)}`);
            if (JSON.stringify(quoteRes.data).includes('API key') || JSON.stringify(quoteRes.data).includes('configured')) {
                console.log('PASS: Fails gracefully with configuration error');
            }
        }
    } catch (err) {
        console.error('ERROR:', err);
    }
}

run();
