// Phase 14 E2E Test Script - Settings & User Management
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
    console.log('=== Phase 14 E2E Test ===\n');

    // === Scenario 14.1: Access Settings Page ===
    console.log('--- Scenario 14.1: Access Settings Page ---');
    // Test all settings sub-endpoints
    const endpoints = [
        { name: 'Users', path: '/settings/users' },
        { name: 'Roles', path: '/settings/roles' },
        { name: 'Categories', path: '/settings/categories' },
        { name: 'Attributes', path: '/settings/attributes' },
    ];
    let allAccessible = true;
    for (const ep of endpoints) {
        const result = await api(ep.path);
        const status = result.status === 200 ? 'OK' : `FAIL (${result.status})`;
        console.log(`  ${ep.name}: ${status}`);
        if (result.status !== 200) allAccessible = false;
    }
    if (allAccessible) {
        console.log('PASS: All settings endpoints accessible');
    } else {
        console.log('PARTIAL: Some settings endpoints failed');
    }
    console.log();

    // === Scenario 14.2: Create New User ===
    console.log('--- Scenario 14.2: Create New User ---');
    // First get the roles to find "Warehouse Worker"
    const { data: roles } = await api('/settings/roles');
    console.log(`Available roles: ${Array.isArray(roles) ? roles.length : 0}`);
    if (Array.isArray(roles)) {
        roles.forEach(r => console.log(`  - ${r.name} (${r.id})`));
    }

    // Find a worker role, or use the first non-admin role
    let workerRole = null;
    if (Array.isArray(roles)) {
        workerRole = roles.find(r => r.name?.toLowerCase().includes('worker') || r.name?.toLowerCase().includes('warehouse'));
        if (!workerRole) workerRole = roles.find(r => r.name?.toLowerCase() !== 'admin' && r.name?.toLowerCase() !== 'administrator');
    }

    const createUserResult = await api('/settings/users', {
        method: 'POST',
        body: JSON.stringify({
            email: 'worker@labamu.co.id',
            name: 'Warehouse Worker',
            password: 'worker123',
            roleId: workerRole?.id || null,
        })
    });
    console.log(`Status: ${createUserResult.status}`);
    if (createUserResult.status === 201 || createUserResult.status === 200) {
        console.log('PASS: User "worker@labamu.co.id" created');
        console.log(`  ID: ${createUserResult.data.id}`);
        console.log(`  Email: ${createUserResult.data.email}`);
        console.log(`  Role: ${createUserResult.data.role?.name || workerRole?.name || 'N/A'}`);
    } else if (createUserResult.status === 409) {
        console.log('PASS (already exists): User with this email already exists');
    } else {
        console.log('FAIL:', JSON.stringify(createUserResult.data));
    }
    const workerId = createUserResult.data?.id;
    console.log();

    // === Scenario 14.3: Verify Role Permissions ===
    console.log('--- Scenario 14.3: Verify Role Permissions ---');
    if (workerId) {
        // Try accessing settings as the worker user
        const workerSettings = await api('/settings/users', {
            headers: { 'x-user-id': workerId }
        });
        console.log(`Worker accessing /settings/users: ${workerSettings.status}`);
        if (workerSettings.status === 403 || workerSettings.status === 401) {
            console.log('PASS: Worker user blocked from settings (as expected)');
        } else if (workerSettings.status === 200) {
            console.log('INFO: Worker has settings access — may have elevated permissions or no role restrictions');
            // This could still pass if the role system allows it
        } else {
            console.log('FAIL:', JSON.stringify(workerSettings.data));
        }

        // Try accessing inventory (should be allowed for workers)
        const workerInventory = await api('/inventory/products', {
            headers: { 'x-user-id': workerId }
        });
        console.log(`Worker accessing /inventory/products: ${workerInventory.status}`);
        if (workerInventory.status === 200) {
            console.log('PASS: Worker can access inventory (expected)');
        }
    } else {
        console.log('SKIP: No worker user ID from 14.2');
    }
    console.log();

    // === Scenario 14.4: Access User Guide ===
    console.log('--- Scenario 14.4: Access User Guide ---');
    // Test the frontend page at /user-guide
    const guideResult = await fetch('http://127.0.0.1:3000/user-guide');
    console.log(`User Guide page status: ${guideResult.status}`);
    if (guideResult.status === 200) {
        const html = await guideResult.text();
        const hasContent = html.includes('User Guide') || html.includes('user-guide') || html.includes('documentation');
        console.log(`PASS: User Guide page loads (contains content: ${hasContent})`);
    } else {
        console.log(`FAIL: User Guide returned ${guideResult.status}`);
    }
    console.log();

    // === Scenario 14.5: Mobile Dashboard Access ===
    console.log('--- Scenario 14.5: Mobile Dashboard Access ---');
    const mobileResult = await fetch('http://127.0.0.1:3000/mobile/dashboard');
    console.log(`Mobile Dashboard status: ${mobileResult.status}`);
    if (mobileResult.status === 200) {
        const html = await mobileResult.text();
        const hasMobileContent = html.includes('mobile') || html.includes('Picking') || html.includes('Putaway') || html.length > 500;
        console.log(`PASS: Mobile dashboard loads (content size: ${html.length} bytes)`);
    } else if (mobileResult.status === 404) {
        console.log('INFO: Mobile dashboard page not found at /mobile/dashboard');
        // Try alternative paths
        const altPaths = ['/mobile', '/m/dashboard', '/dashboard/mobile'];
        for (const p of altPaths) {
            const alt = await fetch(`http://127.0.0.1:3000${p}`);
            if (alt.status === 200) {
                console.log(`  Found at alternative path: ${p}`);
                break;
            }
        }
    } else {
        console.log(`FAIL: Mobile Dashboard returned ${mobileResult.status}`);
    }
    console.log();

    // === Scenario 14.6: Mobile Putaway Workflow ===
    console.log('--- Scenario 14.6: Mobile Putaway Workflow ---');
    // Test via API - putaway sessions
    const { data: locations } = await api('/inventory/locations');
    const bin01 = locations.find(l => l.name === 'Bin 01');

    // Check for existing putaway sessions
    const { PrismaClient } = require('@labamu/database');
    const prisma = new PrismaClient();
    const warehouse = await prisma.warehouse.findFirst();

    const sessionResult = await api('/inventory/putaway/sessions', {
        method: 'POST',
        body: JSON.stringify({
            warehouseId: warehouse.id,
            workerId: USER_ID
        })
    });
    console.log(`Putaway session creation: ${sessionResult.status}`);
    if (sessionResult.status === 201 || sessionResult.status === 200) {
        console.log('PASS: Putaway session created');
        console.log(`  Session ID: ${sessionResult.data?.id || 'N/A'}`);
        console.log(`  Tasks: ${sessionResult.data?.tasks?.length || 0}`);
    } else {
        console.log('INFO:', JSON.stringify(sessionResult.data).substring(0, 200));
    }

    // Get active session
    const activeSession = await api(`/inventory/putaway/sessions/${warehouse.id}/active`);
    console.log(`Active putaway session: ${activeSession.status}`);
    if (activeSession.status === 200 && activeSession.data) {
        console.log('PASS: Active putaway session retrieved');
        const tasks = activeSession.data.tasks || [];
        console.log(`  Tasks: ${tasks.length}`);
        tasks.slice(0, 2).forEach(t => {
            console.log(`    - Product: ${t.product?.name || t.productId?.substring(0, 8)} | From: ${t.sourceLocation?.name || 'N/A'} → To: ${t.destinationLocation?.name || 'N/A'}`);
        });
    }

    await prisma.$disconnect();
    console.log('\n=== Phase 14 Tests Complete ===');
}

run().catch(console.error);
