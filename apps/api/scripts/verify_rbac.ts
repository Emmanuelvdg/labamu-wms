
export { };
const API_URL = 'http://localhost:3001';

async function verifyRBAC() {
    console.log('Starting RBAC Verification...');

    // 1. Login as Admin
    console.log('\n--- Test 1: Admin Login ---');
    let adminToken = '';
    let adminId = '';
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'admin' })
        });
        const data = await res.json();

        // API returns the user object directly on success
        if (res.ok && (data as any).id) {
            console.log('✅ Admin Login Successful');
            adminId = (data as any).id;
        } else {
            console.error('❌ Admin Login Failed', data);
            process.exit(1);
        }
    } catch (e: any) {
        console.error('❌ Admin Login Error', e.message);
        process.exit(1);
    }

    // 2. Login as Viewer
    console.log('\n--- Test 2: Viewer Login ---');
    let viewerId = '';
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'viewer@labamu.co.id', password: 'viewer' })
        });
        const data = await res.json();

        if (res.ok && (data as any).id) {
            console.log('✅ Viewer Login Successful');
            viewerId = (data as any).id;
        } else {
            console.error('❌ Viewer Login Failed', data);
            process.exit(1);
        }
    } catch (e: any) {
        console.error('❌ Viewer Login Error', e.message);
        process.exit(1);
    }

    // 3. Viewer Try Create Product (Should Fail)
    console.log('\n--- Test 3: Viewer Create Product (Expect 403) ---');
    try {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': viewerId
            },
            body: JSON.stringify({
                sku: 'TEST-FAIL',
                name: 'Forbidden Product',
                category: 'Test',
                classification: 'A',
                type: 'Raw',
                unitOfMeasure: 'Unit',
                averageCost: 100,
                status: 'Active',
                tracking: 'none'
            })
        });

        if (res.status === 403) {
            console.log('✅ Viewer Create Product Blocked (403 Forbidden)');
        } else {
            console.error(`❌ Unexpected Status: ${res.status}`);
            if (res.ok) console.error('❌ Viewer Created Product (Should have failed!)');
        }
    } catch (e: any) {
        console.error('❌ Unexpected Error', e.message);
    }

    // 4. Viewer Try Read Inventory (Should Succeed)
    console.log('\n--- Test 4: Viewer Read Inventory (Expect 200) ---');
    try {
        const res = await fetch(`${API_URL}/inventory`, {
            headers: { 'x-user-id': viewerId }
        });
        if (res.status === 200) {
            console.log('✅ Viewer Read Inventory Successful');
        } else {
            console.error(`❌ Viewer Read Inventory Failed: ${res.status}`);
        }
    } catch (e: any) {
        console.error('❌ Viewer Read Inventory Error', e.message);
    }

    // 5. Viewer Try Access Settings (Should Fail)
    console.log('\n--- Test 5: Viewer Access Settings (Expect 403) ---');
    try {
        const res = await fetch(`${API_URL}/settings/roles`, {
            headers: { 'x-user-id': viewerId }
        });

        if (res.status === 403) {
            console.log('✅ Viewer Settings Access Blocked (403 Forbidden)');
        } else {
            console.error(`❌ Unexpected Status: ${res.status}`);
            if (res.ok) console.error('❌ Viewer Accessed Settings (Should have failed!)');
        }
    } catch (e: any) {
        console.error('❌ Unexpected Error', e.message);
    }

    console.log('\nRBAC Verification Complete.');
}

verifyRBAC();
