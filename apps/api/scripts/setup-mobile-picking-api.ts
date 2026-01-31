
const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001';

async function request(path, options = {}, userId = null) {
    options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
    };
    if (userId) {
        options.headers['x-user-id'] = userId;
    }

    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
}

async function main() {
    console.log('--- API Setup for Mobile Picking (Advanced) ---');

    // 0. Login
    console.log('Logging in...');
    let user;
    try {
        const loginRes = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'password123' })
        });
        user = loginRes.user || loginRes;
        console.log(`Logged in as: ${user.email} (${user.id})`);
    } catch (e) {
        console.error('Login failed:', e.message);
    }
    const userId = user ? user.id : 'user-1';

    // 1. Get Product
    const products = await request('/inventory/products', {}, userId);
    if (!products || products.length === 0) throw new Error('No products found');
    const product = products[0];
    console.log(`Using Product: ${product.sku} (${product.id})`);

    // 2. Get Warehouse
    const warehouses = await request('/inventory/warehouses', {}, userId);
    const warehouse = warehouses[0];
    if (!warehouse) throw new Error('Warehouse not found');
    console.log(`Using Warehouse: ${warehouse.name} (${warehouse.id})`);

    // 3. Get Customer
    let customerId;
    try {
        const customers = await request('/customers', {}, userId);
        if (customers && customers.length > 0) {
            customerId = customers[0].id;
            console.log(`Using Customer: ${customers[0].name} (${customerId})`);
        }
    } catch (e) { console.warn('Failed to fetch customers', e.message); }

    if (!customerId) {
        // Create one? Or try to post without it if allowed?
        // Let's try to create one if allowed
        console.log('Creating generic customer...');
        const newCust = await request('/customers', {
            method: 'POST',
            body: JSON.stringify({ name: 'Mobile Test Customer', email: 'mobile-test@example.com' })
        }, userId);
        customerId = newCust.id;
    }

    // 4. Create Order
    const orderData = {
        customerId: customerId,
        priority: 'NORMAL',
        warehouseId: warehouse.id,
        items: [{ productId: product.id, quantity: 1 }]
    };

    console.log('Creating Order...');
    let order = await request('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    }, userId);
    console.log(`Order Created: ${order.id}, Status: ${order.status}, Fulfillment: ${order.fulfillmentStatus}`);

    // 5. Force Allocation Status
    if (order.fulfillmentStatus !== 'ALLOCATED') {
        console.log('Forcing ALLOCATED status...');
        try {
            order = await request(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify({ fulfillmentStatus: 'ALLOCATED', status: 'CONFIRMED' })
            }, userId);
            console.log(`Order Updated: ${order.fulfillmentStatus}`);
        } catch (e) {
            console.warn('Update failed:', e.message);
        }
    }

    console.log('--- Setup Complete ---');
}

(async () => {
    if (typeof fetch === 'undefined') {
        try {
            global.fetch = require('node-fetch');
        } catch (e) {
            console.error('node-fetch not found');
            process.exit(1);
        }
    }
    await main().catch(console.error);
})();
