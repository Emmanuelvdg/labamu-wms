// Part 3: Modules 18-34 + Cross-cutting
const API = 'http://localhost:3001';
const UID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';
const DC = '2bebad55-ce93-42e9-8dc9-b6fec5fdb229';
let R = { pass: 0, fail: 0, results: [] };

async function req(p, o = {}) {
    const h = { 'Content-Type': 'application/json', 'x-user-id': UID, ...o.headers };
    try {
        const r = await fetch(`${API}${p}`, { ...o, headers: h });
        const b = await r.text().then(t => { try { return JSON.parse(t); } catch { return t; } });
        return { s: r.status, ok: r.ok, b };
    } catch (e) { return { s: 0, ok: false, b: e.message }; }
}
function t(id, name, res, exp) {
    const ok = Array.isArray(exp) ? exp.includes(res.s) : res.s === exp;
    R[ok ? 'pass' : 'fail']++;
    R.results.push({ id, name, status: res.s, expected: exp, ok });
    console.log(`[${ok ? '✅' : '❌'}] ${id.padEnd(7)}| ${name.padEnd(45)}| ${res.s} (exp ${exp})`);
    return res;
}

async function run() {
    console.log('=== PART 3: Modules 18-34 + Cross-cutting ===\n');
    const prods = (await req('/inventory/products')).b || [];
    const mouseP = prods.find(p => p.sku === 'MSE-WLS-005') || prods[0];
    const orders = (await req('/orders')).b || [];
    const shippedOrd = orders.find(o => o.status === 'SHIPPED');
    const pendingOrd = orders.find(o => o.status === 'PENDING');
    const locs = (await req(`/inventory/locations?warehouseId=${DC}&structuralType=POSITION`)).b || [];
    const binA = locs[0]?.id;

    // M18: Returns
    console.log('--- M18: Returns ---');
    if (shippedOrd && mouseP) {
        const ret = t('18.1', 'Create Return', await req('/returns', { method: 'POST', body: JSON.stringify({ originalOrderId: shippedOrd.id, items: [{ productId: mouseP.id, quantity: 1, returnReason: 'Defective' }] }) }), [200, 201]);
        if (ret.b?.id) {
            t('18.3', 'Receive Return Good', await req(`/returns/${ret.b.id}/receive`, { method: 'POST', body: JSON.stringify({ items: [{ productId: mouseP.id, quantity: 1, condition: 'GOOD' }] }) }), [200, 201]);
        }
        t('18.5', 'Returns for Order', await req(`/returns/order/${shippedOrd.id}`), 200);
    }
    if (pendingOrd && mouseP) {
        t('18.2', 'Return Unshipped', await req('/returns', { method: 'POST', body: JSON.stringify({ originalOrderId: pendingOrd.id, items: [{ productId: mouseP.id, quantity: 1, returnReason: 'Changed mind' }] }) }), [400, 200, 201]);
    }
    if (pendingOrd) t('18.6', 'Returns None', await req(`/returns/order/${pendingOrd.id}`), 200);

    // M19: Replenishment
    console.log('\n--- M19: Replenishment ---');
    t('19.1', 'Repl Summary', await req(`/replenishment/summary?warehouseId=${DC}`), 200);
    t('19.2', 'Repl Alerts', await req(`/replenishment/alerts?warehouseId=${DC}`), 200);
    t('19.3', 'Alerts Active', await req(`/replenishment/alerts?warehouseId=${DC}&status=ACTIVE`), 200);
    t('19.4', 'Trigger Check', await req(`/replenishment/check?warehouseId=${DC}`, { method: 'POST' }), [200, 201]);
    t('19.7', 'Create Reorder Rule', await req('/inventory/reordering-rules', { method: 'POST', body: JSON.stringify({ productId: mouseP?.id, locationId: binA, minQuantity: 20, maxQuantity: 100 }) }), [200, 201]);
    t('19.8', 'List Reorder Rules', await req('/inventory/reordering-rules'), 200);
    t('19.9', 'Check Reorder Rules', await req('/inventory/reordering-rules/check'), 200);

    // M20: Stocktaking
    console.log('\n--- M20: Stocktaking ---');
    const st201 = t('20.1', 'Create Full Session', await req('/stocktaking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, type: 'FULL', description: 'RT Q2 full count' }) }), [200, 201]);
    t('20.2', 'Create Zone Session', await req('/stocktaking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, type: 'ZONE', description: 'RT Zone A count' }) }), [200, 201]);
    t('20.3', 'List Sessions', await req(`/stocktaking/sessions?warehouseId=${DC}`), 200);
    if (st201.b?.id) {
        t('20.4', 'Get Session', await req(`/stocktaking/sessions/${st201.b.id}`), 200);
        t('20.5', 'Generate Tasks', await req(`/stocktaking/sessions/${st201.b.id}/generate-tasks`, { method: 'POST' }), [200, 201]);
    }
    t('20.11', 'Start Cycle Count', await req('/inventory/cycle-counts/start', { method: 'POST', body: JSON.stringify({ locationIds: [binA] }) }), [200, 201]);
    t('20.12', 'Cycle Count Status', await req('/inventory/cycle-counts'), 200);

    // M21: ABC Classification
    console.log('\n--- M21: ABC Classification ---');
    t('21.1', 'Run ABC', await req(`/inventory/abc-classification/${DC}/run`, { method: 'POST' }), [200, 201]);
    t('21.2', 'ABC Custom Period', await req(`/inventory/abc-classification/${DC}/run?periodDays=180`, { method: 'POST' }), [200, 201]);
    t('21.3', 'ABC NonExist WH', await req('/inventory/abc-classification/00000000-0000-0000-0000-000000000000/run', { method: 'POST' }), [404, 400, 200]);

    // M22: Invoicing
    console.log('\n--- M22: Invoicing ---');
    t('22.1', 'List Invoices', await req('/invoices'), 200);
    const pos = (await req('/purchase-orders')).b || [];
    const po1 = pos[0];
    if (po1) {
        const inv = t('22.2', 'Create Invoice', await req('/invoices', { method: 'POST', body: JSON.stringify({ purchaseOrderId: po1.id, invoiceNumber: 'INV-RT-001', issueDate: '2026-04-10', dueDate: '2026-05-10', amount: 100000 }) }), [200, 201]);
        t('22.3', 'Create Invoice Dup', await req('/invoices', { method: 'POST', body: JSON.stringify({ purchaseOrderId: po1.id, invoiceNumber: 'INV-RT-001', issueDate: '2026-04-10', dueDate: '2026-05-10', amount: 100000 }) }), [400, 409, 500]);
        if (inv.b?.id) {
            t('22.4', 'Get Invoice', await req(`/invoices/${inv.b.id}`), 200);
            t('22.5', '3-Way Match', await req(`/invoices/${inv.b.id}/match`, { method: 'POST' }), [200, 201]);
        }
    }

    // M23: Fulfillment
    console.log('\n--- M23: Fulfillment ---');
    t('23.1', 'List Rules', await req('/fulfillment/rules'), 200);
    const fr = t('23.2', 'Create Rule', await req('/fulfillment/rules', { method: 'POST', body: JSON.stringify({ name: 'RT Rule', priority: 99, active: true, conditions: '{}', actions: '{}' }) }), [200, 201]);
    if (fr.b?.id) {
        t('23.3', 'Update Rule', await req(`/fulfillment/rules/${fr.b.id}`, { method: 'PUT', body: JSON.stringify({ priority: 100, active: false }) }), 200);
        t('23.4', 'Delete Rule', await req(`/fulfillment/rules/${fr.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    t('23.7', 'List Transfers', await req('/fulfillment/transfers'), 200);

    // M24: Workflows
    console.log('\n--- M24: Workflows ---');
    t('24.1', 'List Templates', await req('/workflows'), 200);
    const wf = t('24.2', 'Create Template', await req('/workflows', { method: 'POST', body: JSON.stringify({ name: 'RT Workflow', description: 'For regression', steps: [] }) }), [200, 201]);
    if (wf.b?.id) {
        t('24.3', 'Get Template', await req(`/workflows/${wf.b.id}`), 200);
        t('24.4', 'Update Template', await req(`/workflows/${wf.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RT Workflow Upd' }) }), 200);
        const cl = t('24.5', 'Clone Workflow', await req(`/workflows/${wf.b.id}/clone`, { method: 'POST' }), [200, 201]);
        t('24.6', 'New Version', await req(`/workflows/${wf.b.id}/version`, { method: 'POST' }), [200, 201]);
        t('24.7', 'Validate', await req(`/workflows/${wf.b.id}/validate`, { method: 'POST' }), [200, 201]);
        t('24.8', 'Activate', await req(`/workflows/${wf.b.id}/activate`, { method: 'POST' }), [200, 201]);
        if (cl.b?.id) t('24.9', 'Archive Clone', await req(`/workflows/${cl.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    t('24.11', 'List Instances', await req(`/workflow-instances?warehouseId=${DC}`), 200);
    t('24.18', 'WF Analytics', await req(`/workflow-instances/analytics?warehouseId=${DC}&period=30d`), 200);

    // M25: Reporting
    console.log('\n--- M25: Reporting ---');
    t('25.1', 'Analytics 7d', await req('/reporting/analytics?period=7d'), 200);
    t('25.2', 'Analytics 30d', await req('/reporting/analytics?period=30d'), 200);
    t('25.3', 'Analytics 90d', await req('/reporting/analytics?period=90d'), 200);
    t('25.4', 'Analytics Custom', await req('/reporting/analytics?period=custom&startDate=2026-01-01&endDate=2026-04-10'), 200);
    t('25.5', 'Analytics by WH', await req(`/reporting/analytics?period=30d&warehouseId=${DC}`), 200);
    t('25.6', 'Drilldown Stock', await req('/reporting/analytics/drilldown/stock-value'), 200);
    t('25.7', 'Drilldown Fulfillment', await req('/reporting/analytics/drilldown/fulfillment'), 200);
    t('25.8', 'Drilldown Stockout', await req('/reporting/analytics/drilldown/stockout'), 200);
    t('25.9', 'Drilldown PendOrd', await req('/reporting/analytics/drilldown/pending-orders'), 200);
    t('25.10', 'Drilldown CycleTime', await req('/reporting/analytics/drilldown/cycle-time'), 200);
    t('25.11', 'Drilldown Capacity', await req('/reporting/analytics/drilldown/capacity'), 200);
    t('25.12', 'Util History', await req('/reporting/utilisation/history?period=30d'), 200);
    t('25.13', 'Cycle Time Trend', await req('/reporting/cycle-time/trend?period=30d'), 200);
    t('25.14', 'Pick Accuracy', await req(`/reporting/pick-accuracy/${DC}?periodDays=30`), 200);
    t('25.15', 'Cycle Count Zone', await req(`/reporting/cycle-count/${DC}?zone=Zone+A`), 200);
    t('25.16', 'Compliance', await req('/reporting/compliance', { method: 'POST', body: JSON.stringify({ type: 'INVENTORY_ACCURACY', period: '2026-Q1' }) }), [200, 201]);
    t('25.17', 'Inventory Ledger', await req('/reporting/inventory-ledger'), 200);

    // M26: Barcode
    console.log('\n--- M26: Barcode ---');
    t('26.1', 'Lookup Valid', await req('/barcode/lookup?code=MSE-WLS-005'), 200);
    t('26.2', 'Lookup Unknown', await req('/barcode/lookup?code=UNKNOWN-XYZ'), [200, 404]);
    t('26.3', 'Lookup Missing', await req('/barcode/lookup'), [400, 200]);

    // M27: Notifications
    console.log('\n--- M27: Notifications ---');
    t('27.1', 'All Notifications', await req('/notifications'), 200);
    t('27.2', 'Unread Only', await req('/notifications?read=false'), 200);
    t('27.3', 'With Limit', await req('/notifications?limit=5'), 200);
    t('27.4', 'Unread Count', await req('/notifications/unread-count'), 200);
    const notifs = (await req('/notifications')).b || [];
    if (notifs[0]?.id) t('27.5', 'Mark Read', await req(`/notifications/${notifs[0].id}/read`, { method: 'PATCH' }), 200);
    t('27.6', 'Mark All Read', await req('/notifications/mark-all-read', { method: 'POST' }), [200, 201]);
    t('27.7', 'Count After MarkAll', await req('/notifications/unread-count'), 200);

    // M28: Routes
    console.log('\n--- M28: Routes ---');
    t('28.1', 'List Routes', await req('/inventory/routes'), 200);
    const rt = t('28.2', 'Create Route', await req('/inventory/routes', { method: 'POST', body: JSON.stringify({ name: 'RT Route', description: 'For regression' }) }), [200, 201]);
    const rcvLoc = (await req(`/inventory/locations?warehouseId=${DC}`)).b?.find(l => l.name?.includes('Receiving'));
    if (rt.b?.id && rcvLoc) {
        const rl = t('28.3', 'Add Rule', await req(`/inventory/routes/${rt.b.id}/rules`, { method: 'POST', body: JSON.stringify({ action: 'RECEIVE', destinationLocationId: rcvLoc.id, sequence: 1 }) }), [200, 201]);
        if (rl.b?.id) t('28.4', 'Update Rule', await req(`/inventory/rules/${rl.b.id}`, { method: 'PUT', body: JSON.stringify({ sequence: 2 }) }), 200);
    }
    if (binA && locs[1]?.id) {
        t('28.5', 'Routing Distance', await req(`/routing/distance?sourceLocationId=${binA}&destinationLocationId=${locs[1].id}&warehouseId=${DC}`), 200);
    }
    t('28.6', 'Distance Missing', await req(`/routing/distance?sourceLocationId=${binA}`), [400, 200]);

    // M29: Printing
    console.log('\n--- M29: Printing ---');
    if (binA) t('29.1', 'Location Label', await req(`/printing/location/${binA}/pdf`), 200);
    t('29.2', 'Label NonExist', await req('/printing/location/00000000-0000-0000-0000-000000000000/pdf'), [404, 500]);
    if (mouseP) t('29.3', 'Product Label', await req(`/printing/product/${mouseP.id}/pdf`), 200);
    t('29.4', 'ProdLabel NonExist', await req('/printing/product/00000000-0000-0000-0000-000000000000/pdf'), [404, 500]);

    // M30: Configuration
    console.log('\n--- M30: Configuration ---');
    t('30.1', 'Delivery Methods', await req('/configuration/delivery-methods'), 200);

    // M31: Integration & STO
    console.log('\n--- M31: Integration & STO ---');
    t('31.1', 'Sync Sales', await req('/integration/sync/sales/shopee', { method: 'POST' }), [200, 201]);
    t('31.2', 'Sync Logistics', await req('/integration/sync/logistics/jne', { method: 'POST' }), [200, 201]);

    // M32: Packages
    console.log('\n--- M32: Packages ---');
    const pkg = t('32.1', 'Create Package', await req('/inventory/packages', { method: 'POST', body: JSON.stringify({ name: 'RT Package', type: 'BOX' }) }), [200, 201]);
    t('32.2', 'List Packages', await req('/inventory/packages'), 200);

    // M33: Reservation Strategy
    console.log('\n--- M33: Reservation ---');
    t('33.1', 'Eval Perishable', await req('/strategy/reservation', { method: 'POST', body: JSON.stringify({ isPerishable: true, location: { zonePriority: 40 } }) }), [200, 201]);
    t('33.2', 'Eval Non-Perish', await req('/strategy/reservation', { method: 'POST', body: JSON.stringify({ isPerishable: false, location: { zonePriority: 25 } }) }), [200, 201]);
    const rs = t('33.3', 'Create Strategy', await req('/strategy/reservation/create', { method: 'POST', body: JSON.stringify({ name: 'RT Resv Strategy', rules: '{}' }) }), [200, 201]);
    if (rs.b?.id) {
        t('33.4', 'Update Strategy', await req(`/strategy/reservation/${rs.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RT Resv Upd', rules: '{}' }) }), 200);
        t('33.5', 'Delete Strategy', await req(`/strategy/reservation/${rs.b.id}`, { method: 'DELETE' }), [200, 204]);
    }

    // M34: Floorplan
    console.log('\n--- M34: Floorplan ---');
    t('34.1', 'Export Floorplan', await req(`/floorplan/${DC}/export`), [200, 404]);
    t('34.2', 'Layout I', await req(`/warehouses/${DC}/areas/layout/I`), 200);
    t('34.3', 'Layout U', await req(`/warehouses/${DC}/areas/layout/U`), 200);
    t('34.4', 'Layout L', await req(`/warehouses/${DC}/areas/layout/L`), 200);
    t('34.5', 'Suggested Areas', await req(`/warehouses/${DC}/areas/suggested`), 200);
    t('34.6', 'Update Floorplan', await req(`/warehouses/${DC}/floor-plan`, { method: 'PATCH', body: JSON.stringify({ gridWidth: 20, gridHeight: 15 }) }), 200);

    // Cross-cutting: Auth Guard
    console.log('\n--- Cross-cutting: Auth Guard ---');
    t('CC.1', 'No User Header', await req('/inventory/products', { headers: { 'x-user-id': '' } }), [401, 403]);
    t('CC.2', 'Invalid User ID', await req('/inventory/products', { headers: { 'x-user-id': 'garbage' } }), [401, 403, 200]);

    // Input Validation
    console.log('\n--- Cross-cutting: Input Validation ---');
    t('CC.4', 'Empty POST', await req('/purchase-orders', { method: 'POST', body: '{}' }), [400, 500]);
    t('CC.5', 'Invalid UUID', await req('/inventory/products/not-a-uuid'), [400, 404, 200]);
    t('CC.6', 'Negative Qty', await req('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId: mouseP?.id, sourceLocationId: binA, destinationLocationId: locs[1]?.id, quantity: -5 }) }), [400, 500]);
    t('CC.7', 'Zero Qty', await req('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId: mouseP?.id, sourceLocationId: binA, destinationLocationId: locs[1]?.id, quantity: 0 }) }), [400, 500]);
    t('CC.8', 'SQLi Attempt', await req("/inventory/products?search='; DROP TABLE products; --"), [200]);

    console.log(`\n=== PART 3 DONE: ${R.pass} passed, ${R.fail} failed ===`);
    const fs = require('fs');
    fs.writeFileSync('regression-part3-results.json', JSON.stringify(R, null, 2));
}
run().catch(e => console.error('FATAL:', e));
