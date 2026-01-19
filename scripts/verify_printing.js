const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001';

async function verifyPrinting() {
    try {
        console.log('0. Authenticating...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'admin' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const userId = loginData.id;

        if (!userId) throw new Error('No user ID returned');
        console.log(`   [SUCCESS] Logged in (User ID: ${userId}).`);

        // Assuming x-user-id is the auth mechanism based on AuthController code
        const headers = {
            'x-user-id': userId
        };

        console.log('1. Fetching a Location and Product to test...');

        // Get a location
        const locRes = await fetch(`${API_URL}/inventory/locations?limit=1`, { headers });
        if (!locRes.ok) throw new Error(`Failed to fetch locations: ${locRes.statusText}`);
        const locations = await locRes.json();
        const location = Array.isArray(locations) ? locations[0] : locations;

        const locId = location.id || (location.children && location.children[0]?.id);

        if (!locId) throw new Error('No location found to test.');
        console.log(`   Found Location ID: ${locId}`);

        // Get a product
        const prodRes = await fetch(`${API_URL}/inventory/products?limit=1`, { headers });
        if (!prodRes.ok) throw new Error(`Failed to fetch products: ${prodRes.statusText}`);
        const products = await prodRes.json();
        const product = products.data ? products.data[0] : products[0];

        if (!product?.id) throw new Error('No product found to test.');
        console.log(`   Found Product ID: ${product.id}`);

        console.log('2. Requesting Location Label (PDF)...');
        const locPdfRes = await fetch(`${API_URL}/printing/location/${locId}/pdf`, { headers });
        if (!locPdfRes.ok) throw new Error(`Failed to generate Location PDF: ${locPdfRes.statusText} (${await locPdfRes.text()})`);

        // Save to file
        const locBuffer = await locPdfRes.arrayBuffer();
        fs.writeFileSync('test_location_label.pdf', Buffer.from(locBuffer));
        console.log('   [SUCCESS] Saved test_location_label.pdf');

        console.log('3. Requesting Product Label (PDF)...');
        const prodPdfRes = await fetch(`${API_URL}/printing/product/${product.id}/pdf`, { headers });
        if (!prodPdfRes.ok) throw new Error(`Failed to generate Product PDF: ${prodPdfRes.statusText} (${await prodPdfRes.text()})`);

        // Save to file
        const prodBuffer = await prodPdfRes.arrayBuffer();
        fs.writeFileSync('test_product_label.pdf', Buffer.from(prodBuffer));
        console.log('   [SUCCESS] Saved test_product_label.pdf');

        console.log('\nVerification Complete!');
    } catch (err) {
        console.error('\n[ERROR]', err.message);
        if (err.cause) console.error(err.cause);
    }
}

verifyPrinting();
