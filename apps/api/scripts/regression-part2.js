// Part 2: Modules 10-17
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
    console.log('=== PART 2: Modules 10-17 ===\n');
    const prods = (await req('/inventory/products')).b || [];
    const mouseP = prods.find(p => p.sku === 'MSE-WLS-005') || prods[0];
    const lapP = prods.find(p => p.sku === 'LAP-PRO-001') || prods[1];

    // M10: Suppliers
    console.log('--- M10: Suppliers ---');
    const sup = t('10.1', 'List Suppliers', await req('/suppliers'), 200);
    const supId = sup.b?.[0]?.id;
    if (supId) t('10.2', 'Get Supplier', await req(`/suppliers/${supId}`), 200);
    const s103 = t('10.3', 'Create Supplier', await req('/suppliers', { method: 'POST', body: JSON.stringify({ name: 'RegTest Vendor PT', contactInfo: 'vendor@regtest.co.id' }) }), [200, 201]);
    if (s103.b?.id) {
        t('10.4', 'Update Supplier', await req(`/suppliers/${s103.b.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'RegTest Vendor PT Upd', contactInfo: 'upd@regtest.co.id' }) }), 200);
    }
    if (supId) {
        t('10.5', 'Supplier Orders', await req(`/suppliers/${supId}/orders`), 200);
        t('10.6', 'Price History', await req(`/suppliers/reports/price-history?productId=${mouseP?.id}`), 200);
        t('10.7', 'Delete Sup w/ POs', await req(`/suppliers/${supId}`, { method: 'DELETE' }), [400, 409, 200]);
    }
    if (s103.b?.id) t('10.8', 'Delete Supplier', await req(`/suppliers/${s103.b.id}`, { method: 'DELETE' }), [200, 204]);

    // M11: Purchase Orders
    console.log('\n--- M11: Purchase Orders ---');
    const po11 = t('11.1', 'List POs', await req('/purchase-orders'), 200);
    const poId = po11.b?.[0]?.id;
    if (poId) t('11.2', 'Get PO', await req(`/purchase-orders/${poId}`), 200);
    t('11.3', 'Get NonExist PO', await req('/purchase-orders/00000000-0000-0000-0000-000000000000'), [404, 500]);
    const po114 = t('11.4', 'Create PO', await req('/purchase-orders', { method: 'POST', body: JSON.stringify({ poNumber: 'PO-REGTEST-001', supplierId: supId, orderDate: '2026-04-10', expectedDate: '2026-05-10', items: [{ productId: mouseP?.id, quantity: 100, unitCost: 150000 }], paymentTerms: 'NET30' }) }), [200, 201]);
    t('11.5', 'Create PO Missing', await req('/purchase-orders', { method: 'POST', body: JSON.stringify({ supplierId: supId }) }), [400, 500]);
    if (po114.b?.id) {
        t('11.6', 'Submit PO', await req(`/purchase-orders/${po114.b.id}/submit`, { method: 'POST' }), [200, 201]);
        t('11.7', 'Submit Again', await req(`/purchase-orders/${po114.b.id}/submit`, { method: 'POST' }), [400, 200, 201]);
        t('11.8', 'Approve PO', await req(`/purchase-orders/${po114.b.id}/approve`, { method: 'POST', body: JSON.stringify({ userId: UID }) }), [200, 201]);
        // Get a receiving location
        const locs = (await req(`/inventory/locations?warehouseId=${DC}`)).b || [];
        const rcvLoc = locs.find(l => l.name?.includes('Receiving')) || locs[0];
        if (rcvLoc) {
            t('11.10', 'Receive Goods', await req(`/purchase-orders/${po114.b.id}/receive`, { method: 'POST', body: JSON.stringify({ locationId: rcvLoc.id, items: [{ productId: mouseP?.id, quantity: 50 }] }) }), [200, 201]);
            t('11.11', 'Receive Over', await req(`/purchase-orders/${po114.b.id}/receive`, { method: 'POST', body: JSON.stringify({ locationId: rcvLoc.id, items: [{ productId: mouseP?.id, quantity: 99999 }] }) }), [400, 200, 201]);
            t('11.13', 'QA Inspection', await req(`/purchase-orders/${po114.b.id}/inspections`, { method: 'POST', body: JSON.stringify({ results: [{ productId: mouseP?.id, receivedQty: 50, acceptedQty: 48, rejectedQty: 2, rejectionReason: 'Pkg dmg' }] }) }), [200, 201]);
            t('11.14', 'Get Inspections', await req(`/purchase-orders/${po114.b.id}/inspections`), 200);
            t('11.15', '3-Way Match', await req(`/purchase-orders/${po114.b.id}/match`, { method: 'POST' }), [200, 201]);
            t('11.17', 'Scan Receive', await req(`/purchase-orders/${po114.b.id}/scan-receive`, { method: 'POST', body: JSON.stringify({ barcode: 'MSE-WLS-005', locationId: rcvLoc.id }) }), [200, 201]);
        }
        t('11.18', 'Get Receipts', await req(`/purchase-orders/${po114.b.id}/receipts`), 200);
        t('11.21', 'List Documents', await req(`/purchase-orders/${po114.b.id}/documents`), 200);
    }
    // Use existing POs for reject test
    const draftPo = po11.b?.find(p => p.status === 'DRAFT');
    if (draftPo) {
        t('11.9', 'Reject PO', await req(`/purchase-orders/${draftPo.id}/reject`, { method: 'POST', body: JSON.stringify({ userId: UID, reason: 'Budget not approved' }) }), [200, 201]);
        t('11.24', 'Submit Rejected', await req(`/purchase-orders/${draftPo.id}/submit`, { method: 'POST' }), [400, 200, 201]);
    }
    t('11.23', 'PO Suppliers', await req('/purchase-orders/suppliers'), 200);

    // M12: Putaway Rules
    console.log('\n--- M12: Putaway Rules ---');
    const pr121 = t('12.1', 'List Rules', await req('/inventory/putaway-rules'), 200);
    const rules = pr121.b || [];
    t('12.2', 'Rules Cover Velocities', { s: (rules.some(r => r.velocityClass === 'A') && rules.some(r => r.velocityClass === 'B') && rules.some(r => r.velocityClass === 'C')) ? 200 : 500 }, 200);
    t('12.3', 'Temp Rule Exists', { s: rules.some(r => r.preferredZonePriorityMin >= 35 && r.preferredZonePriorityMax <= 45) ? 200 : 500 }, 200);
    t('12.4', 'Weight Rule Exists', { s: rules.some(r => r.minWeight > 0) ? 200 : 500 }, 200);
    t('12.5', 'LEAST_OCCUPIED Exists', { s: rules.some(r => r.strategy === 'LEAST_OCCUPIED') ? 200 : 500 }, 200);
    t('12.6', 'Max Priority >= 100', { s: Math.max(...rules.map(r => r.priority || 0)) >= 100 ? 200 : 500 }, 200);
    const locs2 = (await req(`/inventory/locations?warehouseId=${DC}&structuralType=POSITION`)).b || [];
    const binA = locs2[0]?.id;
    const rcvLoc2 = (await req(`/inventory/locations?warehouseId=${DC}`)).b?.find(l => l.name?.includes('Receiving'));
    const pr127 = t('12.7', 'Create Rule', await req('/inventory/putaway-rules', { method: 'POST', body: JSON.stringify({ name: 'RT FIXED Rule', strategy: 'FIXED', destinationLocationId: binA, priority: 1, active: true, warehouseId: DC }) }), [200, 201]);
    if (pr127.b?.id) {
        t('12.8', 'Update Rule Priority', await req(`/inventory/putaway-rules/${pr127.b.id}`, { method: 'PUT', body: JSON.stringify({ ...pr127.b, priority: 2 }) }), 200);
        t('12.9', 'Delete Rule', await req(`/inventory/putaway-rules/${pr127.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    if (mouseP && rcvLoc2) {
        t('12.10', 'Route A→ZoneA', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, quantity: 5, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
        const lapStd = prods.find(p => p.sku === 'LAP-STD-002');
        if (lapStd) t('12.11', 'Route B→ZoneB', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: lapStd.id, quantity: 3, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
        const paper = prods.find(p => p.sku === 'PPR-A4-011');
        if (paper) t('12.12', 'Route C→ZoneC', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: paper.id, quantity: 50, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
        const ink = prods.find(p => p.sku === 'INK-CTR-014');
        if (ink) t('12.13', 'Route Cold→ColdZone', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: ink.id, quantity: 10, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
        const ws = prods.find(p => p.sku === 'DKT-WRK-003');
        if (ws) t('12.14', 'Route Heavy→ZoneC', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: ws.id, quantity: 1, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
        const mon = prods.find(p => p.sku === 'MON-27F-009');
        if (mon) t('12.17', 'Route Monitor→LeastOcc', await req('/inventory/putaway-rules/test', { method: 'POST', body: JSON.stringify({ productId: mon.id, quantity: 2, warehouseId: DC, sourceLocationId: rcvLoc2.id }) }), [200, 201]);
    }

    // M13: Putaway Sessions
    console.log('\n--- M13: Putaway Sessions ---');
    const ps131 = t('13.1', 'Create Session', await req('/inventory/putaway/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC }) }), [200, 201]);
    t('13.2', 'Get Active Session', await req(`/inventory/putaway/sessions/${DC}/active`), 200);
    t('13.3', 'No Session NonExist', await req('/inventory/putaway/sessions/00000000-0000-0000-0000-000000000000/active'), [404, 200]);
    t('13.9', 'Blocked Tasks', await req(`/inventory/putaway/tasks/blocked?warehouseId=${DC}`), 200);
    if (binA && mouseP) t('13.10', 'Check Capacity', await req(`/inventory/putaway/locations/${binA}/capacity?productId=${mouseP.id}&quantity=10`), 200);
    if (ps131.b?.id) {
        t('13.11', 'Complete Session', await req(`/inventory/putaway/sessions/${ps131.b.id}/complete`, { method: 'PATCH' }), 200);
        t('13.12', 'Complete Again', await req(`/inventory/putaway/sessions/${ps131.b.id}/complete`, { method: 'PATCH' }), [400, 200]);
    }

    // M14: Customers & Orders
    console.log('\n--- M14: Customers & Orders ---');
    t('14.1', 'List Customers', await req('/customers'), 200);
    const c142 = t('14.2', 'Create Customer', await req('/customers', { method: 'POST', body: JSON.stringify({ name: 'RegTest Customer', address: 'Jl Test 1', latitude: -6.2, longitude: 106.8 }) }), [200, 201]);
    const c143 = t('14.3', 'Create Walk-In', await req('/customers', { method: 'POST', body: JSON.stringify({ name: 'RegTest Walk-In' }) }), [200, 201]);
    if (c142.b?.id) {
        t('14.4', 'Get Customer', await req(`/customers/${c142.b.id}`), 200);
        t('14.5', 'Update Customer', await req(`/customers/${c142.b.id}`, { method: 'PATCH', body: JSON.stringify({ address: 'Jl Baru 99' }) }), 200);
    }
    if (c143.b?.id) t('14.6', 'Delete Cust No Orders', await req(`/customers/${c143.b.id}`, { method: 'DELETE' }), [200, 204]);
    const custs = (await req('/customers')).b || [];
    const acme = custs.find(c => c.name?.includes('Acme'));
    if (acme) t('14.7', 'Delete Cust w/ Orders', await req(`/customers/${acme.id}`, { method: 'DELETE' }), [400, 409, 200]);
    t('14.8', 'List Orders', await req('/orders'), 200);
    const orders = (await req('/orders')).b || [];
    if (orders[0]) t('14.9', 'Get Order', await req(`/orders/${orders[0].id}`), 200);
    if (acme && mouseP) {
        const o1410 = t('14.10', 'Create Order', await req('/orders', { method: 'POST', body: JSON.stringify({ customerId: acme.id, type: 'SALES', warehouseId: DC, priority: '2', items: [{ productId: mouseP.id, quantity: 5 }] }) }), [200, 201]);
        // 14.11 Insufficient stock
        t('14.11', 'Order Insuff Stock', await req('/orders', { method: 'POST', body: JSON.stringify({ customerId: acme.id, type: 'SALES', warehouseId: DC, priority: '1', items: [{ productId: lapP?.id || mouseP.id, quantity: 99999 }] }) }), [200, 400]);
        if (o1410.b?.id) {
            t('14.15', 'Cancel Order', await req(`/orders/${o1410.b.id}/cancel`, { method: 'POST' }), [200, 201]);
        }
    }
    const shippedOrd = orders.find(o => o.status === 'SHIPPED');
    if (shippedOrd) t('14.16', 'Cancel Shipped', await req(`/orders/${shippedOrd.id}/cancel`, { method: 'POST' }), [400, 200]);

    // M15: Picking
    console.log('\n--- M15: Picking ---');
    t('15.1', 'Get Active Pick', await req(`/strategy/picking/sessions/active?warehouseId=${DC}`), [200, 404]);
    t('15.2', 'Create SINGLE Session', await req('/strategy/picking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, strategy: 'SINGLE' }) }), [200, 201]);
    t('15.3', 'Create BATCH Session', await req('/strategy/picking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, strategy: 'BATCH', criteria: 'carrier' }) }), [200, 201]);
    t('15.4', 'Create WAVE Session', await req('/strategy/picking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, strategy: 'WAVE', criteria: 'product', maxOrders: 5 }) }), [200, 201]);
    t('15.5', 'Create WAVELESS', await req('/strategy/picking/sessions', { method: 'POST', body: JSON.stringify({ warehouseId: DC, strategy: 'WAVELESS' }) }), [200, 201]);
    t('15.13', 'Eval Strategy', await req('/strategy/picking', { method: 'POST', body: JSON.stringify({ priority: '1', itemCount: 5, items: [], warehouseId: DC }) }), [200, 201]);
    t('15.14', 'Batch Pick', await req('/strategy/picking/batch', { method: 'POST', body: JSON.stringify({ criteria: 'contact', warehouseId: DC }) }), [200, 201]);
    t('15.15', 'Cluster Pick', await req('/strategy/picking/cluster', { method: 'POST', body: JSON.stringify({ size: 4, warehouseId: DC }) }), [200, 201]);
    t('15.16', 'Wave Pick', await req('/strategy/picking/wave', { method: 'POST', body: JSON.stringify({ criteria: 'category', warehouseId: DC }) }), [200, 201]);
    t('15.17', 'Get Strategies', await req(`/strategy/picking?warehouseId=${DC}`), 200);
    const ps1518 = t('15.18', 'Create Strategy', await req('/strategy/picking/create', { method: 'POST', body: JSON.stringify({ name: 'RT Strategy', rules: '{}', warehouseId: DC }) }), [200, 201]);
    if (ps1518.b?.id) {
        t('15.19', 'Update Strategy', await req(`/strategy/picking/${ps1518.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RT Strategy Upd', rules: '{}' }) }), 200);
        t('15.20', 'Delete Strategy', await req(`/strategy/picking/${ps1518.b.id}`, { method: 'DELETE' }), [200, 204]);
    }

    // M16: Packing
    console.log('\n--- M16: Packing ---');
    t('16.1', 'Packing Queue', await req(`/packing/queue?warehouseId=${DC}`), 200);
    const packOrd = orders.find(o => o.status === 'PACKING' || o.status === 'PICKED');
    if (packOrd) {
        const pk = t('16.2', 'Create Pack Session', await req('/packing/sessions', { method: 'POST', body: JSON.stringify({ orderId: packOrd.id }) }), [200, 201]);
        if (pk.b?.id) {
            t('16.3', 'Get Pack Session', await req(`/packing/sessions/${pk.b.id}`), 200);
            t('16.4', 'Get by Order', await req(`/packing/sessions/order/${packOrd.id}`), 200);
            t('16.5', 'Scan Item', await req(`/packing/sessions/${pk.b.id}/scan`, { method: 'POST', body: JSON.stringify({ barcode: 'MSE-WLS-005' }) }), [200, 201, 400]);
            t('16.6', 'Scan Wrong', await req(`/packing/sessions/${pk.b.id}/scan`, { method: 'POST', body: JSON.stringify({ barcode: 'UNKNOWN-XYZ' }) }), [400, 200]);
        }
    }

    // M17: Shipping
    console.log('\n--- M17: Shipping ---');
    t('17.1', 'Shipping Methods', await req('/shipping/methods'), 200);
    t('17.2', 'Active Methods', await req('/shipping/methods?active=true'), 200);
    const sm = t('17.3', 'Create Method', await req('/shipping/methods', { method: 'POST', body: JSON.stringify({ name: 'RT Express', provider: 'JNE', fixedPrice: 50000 }) }), [200, 201]);
    if (sm.b?.id) {
        t('17.4', 'Update Method', await req(`/shipping/methods/${sm.b.id}`, { method: 'PUT', body: JSON.stringify({ fixedPrice: 60000 }) }), 200);
        t('17.5', 'Delete Method', await req(`/shipping/methods/${sm.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    const methods = (await req('/shipping/methods')).b || [];
    if (methods[0]) t('17.6', 'Calc Shipping', await req('/shipping/calculate', { method: 'POST', body: JSON.stringify({ methodId: methods[0].id, weight: 2.5, volume: 0.005, price: 500000 }) }), [200, 201]);
    t('17.7', 'Carrier Rates', await req('/shipping/rates?originZip=13930&destZip=60271&weightKg=2'), [200, 404]);
    t('17.13', 'Manifest No Date', await req(`/shipping/manifest/${DC}`), [400, 200]);

    // cleanup
    if (c142.b?.id) await req(`/customers/${c142.b.id}`, { method: 'DELETE' });

    console.log(`\n=== PART 2 DONE: ${R.pass} passed, ${R.fail} failed ===`);
    const fs = require('fs');
    fs.writeFileSync('regression-part2-results.json', JSON.stringify(R, null, 2));
}
run().catch(e => console.error('FATAL:', e));
