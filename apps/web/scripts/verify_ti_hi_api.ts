
const fetch = require('node-fetch'); // Assuming availability or using global fetch in newer node

async function verifyTiHi() {
    const API_URL = 'http://localhost:3001';

    try {
        // 1. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const loginData = await loginRes.json();
        const cookie = loginRes.headers.get('set-cookie');
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookie,
            'x-user-id': loginData.id
        };

        // 2. Get Product (use E2E seeded one or any)
        // We'll just fetch a product or assume ID if known. 
        // Better: List products and pick one.
        const productsRes = await fetch(`${API_URL}/inventory/products?take=1`, { headers });
        const products = await productsRes.json();
        const product = products[0];

        if (!product) {
            console.log('No products found to test.');
            return;
        }

        console.log(`Testing with product: ${product.name} (${product.id})`);

        // 3. Create Packaging with Ti-Hi
        const pkgData = {
            productId: product.id,
            name: 'API Test Pallet',
            unitType: 'PALLET',
            quantity: 100,
            ti: 12, // Cartons/Layer
            hi: 4   // Layers
        };

        const createRes = await fetch(`${API_URL}/inventory/products/${product.id}/packaging`, {
            method: 'POST',
            headers,
            body: JSON.stringify(pkgData)
        });

        if (!createRes.ok) {
            console.log('Create failed:', await createRes.text());
            return;
        }

        // 4. Verify Fetch
        const verifRes = await fetch(`${API_URL}/inventory/products/${product.id}/packaging`, { headers });
        const packagings = await verifRes.json();
        const created = packagings.find(p => p.name === 'API Test Pallet');

        if (created) {
            if (created.ti === 12 && created.hi === 4) {
                console.log('✅ Ti-Hi verification PASSED: Values persisted correctly.');
            } else {
                console.log('❌ Ti-Hi verification FAILED: Values mismatch.', created);
            }
        } else {
            console.log('❌ Created packaging not found.');
        }

        // Cleanup
        if (created) {
            await fetch(`${API_URL}/inventory/packaging/${created.id}`, { method: 'DELETE', headers });
            console.log('Cleanup done.');
        }

    } catch (e) {
        console.error('Test error:', e);
    }
}

verifyTiHi();
