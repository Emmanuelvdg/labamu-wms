// Full Platform Regression Runner v2
// Comprehensive API Test Suite for Labamu WMS

const API_BASE = 'http://localhost:3001';
const ADMIN_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': ADMIN_ID,
        ...options.headers
    };

    try {
        const res = await fetch(url, { ...options, headers });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, ok: res.ok, body };
    } catch (e) {
        return { status: 500, ok: false, error: e.message };
    }
}

async function runTests() {
    console.log('\n================================================');
    console.log('🚀  Labamu WMS Full Platform Regression');
    console.log('================================================\n');

    const test = async (id, name, path, options = {}, expected = 200) => {
        const res = await request(path, options);
        const passed = res.status === expected || (expected === 201 && res.status === 200);
        console.log(`[${passed ? '✅' : '❌'}] ${id.padEnd(6)} | ${name.padEnd(30)} | Status: ${res.status}`);
        return res;
    };

    // --- Module 1: Auth & Users ---
    console.log('--- Module 1: Auth & Users ---');
    await test('1.5', 'Auth Me (Authorized)', '/auth/me');
    await test('1.7', 'List Users', '/settings/users');
    await test('1.12', 'Get Available Permissions', '/settings/roles/available-permissions');

    // --- Module 2: Roles ---
    console.log('\n--- Module 2: Roles & Permissions ---');
    await test('2.1', 'List Roles', '/settings/roles');

    // --- Module 3: API Keys ---
    console.log('\n--- Module 3: API Keys ---');
    await test('3.2', 'List API Keys', '/api-keys');

    // --- Module 4: Categories & Attributes ---
    console.log('\n--- Module 4: Categories & Attributes ---');
    await test('4.1', 'List Categories', '/settings/categories');
    await test('4.6', 'List Attribute Definitions', '/inventory/attributes/definitions');

    // --- Module 5: Warehouses & Locations ---
    console.log('\n--- Module 5: Warehouses & Locations ---');
    const dcId = '2bebad55-ce93-42e9-8dc9-b6fec5fdb229';
    await test('5.1', 'List Warehouses', '/inventory/warehouses');
    await test('5.4', 'Warehouse Details', `/warehouses/${dcId}`);
    await test('5.5', 'Location Tree', `/inventory/locations/tree?warehouseId=${dcId}`);
    await test('5.6', 'Locations Flat List', `/inventory/locations?warehouseId=${dcId}`);

    // --- Module 6: Products & Inventory ---
    console.log('\n--- Module 6: Products & Inventory ---');
    const prodRes = await test('6.1', 'List Products', '/inventory/products');
    const productId = prodRes.body[0]?.id;
    if (productId) {
        await test('6.2', 'Product Details', `/inventory/products/${productId}`);
        await test('6.3', 'Product Transactions', `/inventory/transactions/${productId}`);
    }
    await test('6.4', 'List All Batches', '/inventory/batches');

    // --- Module 11: Purchase Orders ---
    console.log('\n--- Module 11: Purchase Orders ---');
    await test('11.1', 'List Purchase Orders', '/purchase-orders');
    await test('11.2', 'PO Suppliers', '/purchase-orders/suppliers');

    // --- Module 13: Putaway ---
    console.log('\n--- Module 13: Putaway ---');
    // Note: Putaway tasks might need a warehouseId filter or session
    await test('13.1', 'Blocked Tasks', `/inventory/putaway/tasks/blocked?warehouseId=${dcId}`);
    await test('13.2', 'Active Session', `/inventory/putaway/sessions/${dcId}/active`);

    console.log('\n================================================');
    console.log('🏁  Regression Complete');
    console.log('================================================\n');
}

runTests().catch(e => console.error('Fatal Test Error:', e));
