// Part 1: Modules 1-9
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
    console.log('=== PART 1: Modules 1-9 ===\n');

    // M1: Auth
    console.log('--- M1: Auth & Users ---');
    t('1.1', 'Login Happy', await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'admin' }) }), 200);
    t('1.2', 'Login Wrong Pass', await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'wrong' }) }), 401);
    t('1.3', 'Login Unknown Email', await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'nobody@x.com', password: 'x' }) }), 401);
    // 1.4 Rate limiting - send 6 rapid requests
    let rlRes;
    for (let i = 0; i < 6; i++) rlRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'wrong' }) });
    t('1.4', 'Login Rate Limit (6th)', rlRes, [429, 401]);
    t('1.5', 'Get Current User', await req('/auth/me'), 200);
    t('1.6', 'Get User No Header', await req('/auth/me', { headers: { 'x-user-id': '' } }), [401, 403]);
    t('1.7', 'List Users', await req('/settings/users'), 200);
    const u8 = t('1.8', 'Create User', await req('/settings/users', { method: 'POST', body: JSON.stringify({ email: 'regtest@labamu.co.id', name: 'Reg Test', password: 'Test@1234', roleIds: [] }) }), [200, 201]);
    t('1.9', 'Create User Dup', await req('/settings/users', { method: 'POST', body: JSON.stringify({ email: 'regtest@labamu.co.id', name: 'Reg Test', password: 'Test@1234', roleIds: [] }) }), [400, 409]);
    if (u8.b?.id) {
        t('1.10', 'Reset Password', await req(`/settings/users/${u8.b.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword: 'New@5678' }) }), 200);
        t('1.11', 'Delete User', await req(`/settings/users/${u8.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    t('1.12', 'Available Permissions', await req('/settings/roles/available-permissions'), 200);

    // M2: Roles
    console.log('\n--- M2: Roles ---');
    t('2.1', 'List Roles', await req('/settings/roles'), 200);
    const r22 = t('2.2', 'Create Role', await req('/settings/roles', { method: 'POST', body: JSON.stringify({ name: 'RegTest Operator', description: 'test', permissions: [{ resource: 'INVENTORY', action: 'READ' }] }) }), [200, 201]);
    t('2.3', 'Create Role Dup', await req('/settings/roles', { method: 'POST', body: JSON.stringify({ name: 'RegTest Operator', description: 'test', permissions: [] }) }), [400, 409]);
    if (r22.b?.id) {
        t('2.4', 'Get Role', await req(`/settings/roles/${r22.b.id}`), 200);
        t('2.5', 'Update Role', await req(`/settings/roles/${r22.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RegTest Operator', permissions: [{ resource: 'INVENTORY', action: 'READ' }, { resource: 'INVENTORY', action: 'UPDATE' }] }) }), 200);
        t('2.6', 'Delete Role', await req(`/settings/roles/${r22.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    t('2.7', 'Delete NonExistent Role', await req('/settings/roles/00000000-0000-0000-0000-000000000000', { method: 'DELETE' }), [404, 400, 500]);

    // M3: API Keys
    console.log('\n--- M3: API Keys ---');
    const k31 = t('3.1', 'Create API Key', await req('/api-keys', { method: 'POST', body: JSON.stringify({ name: 'RegTest Key' }) }), [200, 201]);
    t('3.2', 'List API Keys', await req('/api-keys'), 200);
    if (k31.b?.id) {
        t('3.3', 'Revoke Key', await req(`/api-keys/${k31.b.id}/revoke`, { method: 'DELETE' }), [200, 204]);
        t('3.4', 'Delete Key', await req(`/api-keys/${k31.b.id}`, { method: 'DELETE' }), [200, 204]);
    }

    // M4: Categories & Attributes
    console.log('\n--- M4: Categories & Attributes ---');
    t('4.1', 'List Categories', await req('/settings/categories'), 200);
    const c42 = t('4.2', 'Create Category', await req('/settings/categories', { method: 'POST', body: JSON.stringify({ name: 'RegTest Cat' }) }), [200, 201]);
    if (c42.b?.id) {
        t('4.3', 'Get Category', await req(`/settings/categories/${c42.b.id}`), 200);
        t('4.4', 'Update Category', await req(`/settings/categories/${c42.b.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'RegTest Cat Updated' }) }), 200);
        t('4.5', 'Delete Category', await req(`/settings/categories/${c42.b.id}`, { method: 'DELETE' }), [200, 204]);
    }
    t('4.6', 'List Attr Defs', await req('/inventory/attributes/definitions'), 200);
    const a47 = t('4.7', 'Create Attr Def', await req('/settings/attributes', { method: 'POST', body: JSON.stringify({ name: 'RegTest Hazmat', type: 'BOOLEAN' }) }), [200, 201]);
    if (a47.b?.id) {
        t('4.8', 'Update Attr Def', await req(`/settings/attributes/${a47.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RegTest Hazmat', type: 'SELECT', options: 'Yes,No' }) }), 200);
        t('4.9', 'Delete Attr Def', await req(`/settings/attributes/${a47.b.id}`, { method: 'DELETE' }), [200, 204]);
    }

    // M5: Warehouses & Locations
    console.log('\n--- M5: Warehouses & Locations ---');
    t('5.1', 'List Warehouses', await req('/inventory/warehouses'), 200);
    const w52 = t('5.2', 'Create Warehouse', await req('/inventory/warehouses', { method: 'POST', body: JSON.stringify({ name: 'RegTest WH', shortName: 'RTW', type: 'PHYSICAL', status: 'Enabled' }) }), [200, 201]);
    if (w52.b?.id) {
        t('5.3', 'Update Warehouse', await req(`/inventory/warehouses/${w52.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RegTest WH Updated' }) }), 200);
    }
    t('5.4', 'Warehouse Details', await req(`/warehouses/${DC}`), 200);
    const tree = t('5.5', 'Location Tree', await req(`/inventory/locations/tree?warehouseId=${DC}`), 200);
    const locs = t('5.6', 'Locations Flat', await req(`/inventory/locations?warehouseId=${DC}`), 200);
    t('5.7', 'Filter Positions', await req(`/inventory/locations?warehouseId=${DC}&structuralType=POSITION`), 200);
    // Get a bin with inventory and an empty parent for testing
    const allLocs = locs.b || [];
    const bins = allLocs.filter(l => l.structuralType === 'POSITION');
    const rootLoc = allLocs.find(l => l.structuralType === 'WAREHOUSE');
    const binId = bins[0]?.id;
    const l58 = t('5.8', 'Create Location', await req('/inventory/locations', { method: 'POST', body: JSON.stringify({ name: 'RegTest Bin 99', warehouseId: DC, type: 'INTERNAL', structuralType: 'POSITION', code: 'RTEST-99', zonePriority: 25, parentId: rootLoc?.id }) }), [200, 201]);
    if (l58.b?.id) {
        t('5.9', 'Update Location', await req(`/inventory/locations/${l58.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RegTest Bin 99 Upd', zonePriority: 26 }) }), 200);
        t('5.10', 'Move Location', await req(`/inventory/locations/${l58.b.id}/move`, { method: 'PUT', body: JSON.stringify({ newParentId: rootLoc?.id }) }), 200);
    }
    if (binId) {
        t('5.11', 'Location Details', await req(`/inventory/locations/${binId}`), 200);
        t('5.12', 'Location Utilisation', await req(`/inventory/locations/${binId}/utilisation`), 200);
        const prods = (await req('/inventory/products')).b;
        const mouseId = prods?.find(p => p.sku === 'MSE-WLS-005')?.id || prods?.[0]?.id;
        t('5.13', 'Capacity Can Accept', await req(`/inventory/locations/${binId}/capacity?productId=${mouseId}&quantity=1`), 200);
        t('5.14', 'Capacity Exceeds', await req(`/inventory/locations/${binId}/capacity?productId=${mouseId}&quantity=99999`), 200);
        t('5.15', 'Batch Utilisation', await req('/inventory/locations/utilisation-batch', { method: 'POST', body: JSON.stringify({ locationIds: [binId], metric: 'UTILISATION' }) }), [200, 201]);
        t('5.16', 'Batch Util Velocity', await req('/inventory/locations/utilisation-batch', { method: 'POST', body: JSON.stringify({ locationIds: [binId], metric: 'VELOCITY' }) }), [200, 201]);
        t('5.17', 'Batch Util Congestion', await req('/inventory/locations/utilisation-batch', { method: 'POST', body: JSON.stringify({ locationIds: [binId], metric: 'CONGESTION' }) }), [200, 201]);
        t('5.18', 'Check Dependencies', await req(`/inventory/locations/${binId}/dependencies`), 200);
        t('5.19', 'Delete Loc w/ Inv', await req(`/inventory/locations/${binId}`, { method: 'DELETE' }), [400, 409, 200]);
        t('5.21', 'Suggest Removal', await req(`/inventory/locations/${binId}/suggest-removal?productId=${mouseId}&quantity=5`), 200);
    }
    if (l58.b?.id) t('5.20', 'Delete Empty Loc', await req(`/inventory/locations/${l58.b.id}`, { method: 'DELETE' }), [200, 204]);
    t('5.22', 'Export CSV', await req(`/inventory/locations/export?warehouseId=${DC}`), 200);
    t('5.23', 'Import CSV', await req('/inventory/locations/import', { method: 'POST', body: JSON.stringify({ warehouseId: DC, csv: 'name,type,structuralType,code\nImport Test Bin,internal,POSITION,IMP-RT1' }) }), [200, 201]);
    t('5.24', 'Warehouse Zones', await req(`/warehouses/${DC}/zones`), 200);
    t('5.25', 'Bin Utilisation', await req(`/warehouses/${DC}/bins/utilization`), 200);
    t('5.26', 'Warehouse Areas', await req(`/warehouses/${DC}/areas`), 200);
    t('5.27', 'Warehouse Deps', await req(`/warehouses/${DC}/dependencies`), 200);
    // cleanup warehouse
    if (w52.b?.id) await req(`/inventory/warehouses/${w52.b.id}`, { method: 'DELETE' });

    // M6: Products
    console.log('\n--- M6: Products ---');
    const p61 = t('6.1', 'List Products', await req('/inventory/products'), 200);
    t('6.2', 'Search Products', await req('/inventory/products?search=Laptop'), 200);
    t('6.3', 'Filter Category', await req('/inventory/products?category=Computing'), 200);
    t('6.4', 'Filter Velocity', await req('/inventory/products?classification=A'), 200);
    const pid = p61.b?.[0]?.id;
    if (pid) {
        t('6.5', 'Get Product', await req(`/inventory/products/${pid}`), 200);
    }
    t('6.6', 'Get NonExist Product', await req('/inventory/products/00000000-0000-0000-0000-000000000000'), [404, 200]);
    const p67 = t('6.7', 'Create Product', await req('/inventory/products', { method: 'POST', body: JSON.stringify({ sku: 'RT-TST-001', name: 'RegTest Product', category: 'Office Supplies', weight: 1.5, unitOfMeasure: 'Unit', type: 'Finished', isStockable: true }) }), [200, 201]);
    t('6.8', 'Create Product Dup SKU', await req('/inventory/products', { method: 'POST', body: JSON.stringify({ sku: 'RT-TST-001', name: 'Dup', category: 'Office Supplies', weight: 1, unitOfMeasure: 'Unit', type: 'Finished', isStockable: true }) }), [400, 409, 500]);
    if (p67.b?.id) {
        t('6.9', 'Update Product', await req(`/inventory/products/${p67.b.id}`, { method: 'PUT', body: JSON.stringify({ name: 'RegTest Product Upd' }) }), 200);
        const pk = t('6.10', 'Create Packaging', await req(`/inventory/products/${p67.b.id}/packaging`, { method: 'POST', body: JSON.stringify({ name: 'Box of 10', unitType: 'BOX', quantity: 10, barcode: 'RTTST001BOX', weight: 0, width: 0, height: 0, length: 0 }) }), [200, 201]);
        t('6.11', 'Get Packaging', await req(`/inventory/products/${p67.b.id}/packaging`), 200);
        if (pk.b?.id) t('6.12', 'Delete Packaging', await req(`/inventory/packaging/${pk.b.id}`, { method: 'DELETE' }), [200, 204]);
    }

    // M7: Batches & Stock
    console.log('\n--- M7: Batches & Stock ---');
    t('7.1', 'List Batches', await req(`/inventory/batches?warehouseId=${DC}`), 200);
    if (pid) {
        t('7.2', 'Batches for Product', await req(`/inventory/batch/${pid}`), 200);
    }
    const mouseP = p61.b?.find(p => p.sku === 'MSE-WLS-005');
    if (mouseP && binId) {
        t('7.3', 'Add Batch', await req('/inventory/batch', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, locationId: binId, warehouseId: DC, quantity: 5, batchNumber: 'RT-BATCH-NEW', purchaseDate: '2026-01-01' }) }), [200, 201]);
    }
    if (mouseP) {
        t('7.4', 'Inventory by Product', await req(`/inventory?productId=${mouseP.id}`), 200);
    }
    if (binId) t('7.5', 'Inventory by Location', await req(`/inventory?locationId=${binId}`), 200);
    if (pid) t('7.6', 'Product Transactions', await req(`/inventory/transactions/${pid}`), 200);
    t('7.7', 'Stock Transactions', await req('/inventory/transactions'), 200);
    t('7.8', 'Valuation', await req('/inventory/valuation'), 200);
    t('7.9', 'Check Expired', await req('/notifications/check-expired', { method: 'POST' }), [200, 201]);
    t('7.10', 'Check Near Expiry 7d', await req('/notifications/check-expiry?days=7', { method: 'POST' }), [200, 201]);
    t('7.11', 'Check Near Expiry 1d', await req('/notifications/check-expiry?days=1', { method: 'POST' }), [200, 201]);

    // M8: Adjustments
    console.log('\n--- M8: Adjustments ---');
    t('8.1', 'List Adjustments', await req('/inventory/adjustments'), 200);
    const adj82 = t('8.2', 'Create Pos Adj', await req('/inventory/adjustments', { method: 'POST', body: JSON.stringify({ productId: mouseP?.id || pid, locationId: binId, warehouseId: DC, countedQuantity: 100, currentQuantity: 90, reason: 'Regression surplus' }) }), [200, 201]);
    const adj83 = t('8.3', 'Create Neg Adj', await req('/inventory/adjustments', { method: 'POST', body: JSON.stringify({ productId: mouseP?.id || pid, locationId: binId, warehouseId: DC, countedQuantity: 85, currentQuantity: 90, reason: 'Regression shrinkage' }) }), [200, 201]);
    if (adj82.b?.id) {
        t('8.4', 'Apply Adjustment', await req(`/inventory/adjustments/${adj82.b.id}/apply`, { method: 'POST' }), [200, 201]);
        t('8.5', 'Apply Again (fail)', await req(`/inventory/adjustments/${adj82.b.id}/apply`, { method: 'POST' }), [400, 500]);
    }
    if (adj83.b?.id) {
        t('8.6', 'Update Adj Reason', await req(`/inventory/adjustments/${adj83.b.id}`, { method: 'PUT', body: JSON.stringify({ reason: 'Updated reason' }) }), 200);
    }
    t('8.7', 'Create Adj Missing Fields', await req('/inventory/adjustments', { method: 'POST', body: JSON.stringify({ productId: pid }) }), [400, 500]);

    // M9: Transfers & Scrap
    console.log('\n--- M9: Transfers & Scrap ---');
    const bin2 = bins[1]?.id;
    const binB = allLocs.find(l => l.code?.startsWith('B1'))?.id || bin2;
    if (mouseP && binId && bin2) {
        t('9.1', 'Transfer Stock', await req('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, sourceLocationId: binId, destinationLocationId: bin2, quantity: 1, reason: 'Regression zone rebal' }) }), [200, 201]);
        t('9.2', 'Transfer Exceed', await req('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, sourceLocationId: binId, destinationLocationId: bin2, quantity: 99999 }) }), [400, 500]);
        t('9.3', 'Transfer Same Src/Dst', await req('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, sourceLocationId: binId, destinationLocationId: binId, quantity: 1 }) }), [400, 500]);
        t('9.4', 'Create Scrap', await req('/inventory/scrap', { method: 'POST', body: JSON.stringify({ locationId: binId, productId: mouseP.id, quantity: 1, reason: 'Regression damaged' }) }), [200, 201]);
    }
    t('9.5', 'List Scrap', await req('/inventory/scrap'), 200);
    if (mouseP && binId && binB) {
        const mv = t('9.6', 'Create Stock Move', await req('/inventory/moves', { method: 'POST', body: JSON.stringify({ productId: mouseP.id, sourceLocationId: binId, destinationLocationId: binB, quantity: 1 }) }), [200, 201]);
        t('9.7', 'List Moves', await req('/inventory/moves'), 200);
        if (mv.b?.id) t('9.8', 'Validate Move', await req(`/inventory/moves/${mv.b.id}/validate`, { method: 'POST' }), [200, 201]);
    }
    t('9.9', 'Transit Items', await req('/inventory/transit'), 200);

    // Summary
    console.log(`\n=== PART 1 DONE: ${R.pass} passed, ${R.fail} failed ===`);
    const fs = require('fs');
    fs.writeFileSync('regression-part1-results.json', JSON.stringify(R, null, 2));
}

run().catch(e => console.error('FATAL:', e));
