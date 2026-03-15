const API_URL = 'http://127.0.0.1:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502'; // Admin
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const contentType = res.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = text; }
    } else {
        data = await res.arrayBuffer();
    }
    return { status: res.status, data, contentType };
}

async function run() {
    console.log('=== Phase 16 Shipping Documents ===\n');

    try {
        const product = await prisma.product.findFirst();
        const warehouse = await prisma.warehouse.findFirst();
        const customer = await prisma.customer.findFirst();

        if (!product || !warehouse || !customer) {
            console.log('FAIL: Missing test data in DB');
            return;
        }

        // 1. Create Order
        console.log('--- Step 1: Create Order ---');
        const orderRes = await api('/orders', {
            method: 'POST',
            body: JSON.stringify({
                customerId: customer.id,
                warehouseId: warehouse.id,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId: product.id, quantity: 1 }]
            })
        });
        console.log(`Order Status: ${orderRes.status}`);
        const orderId = orderRes.data.id;

        // 2. Reserve Stock (Optional but good for realism)
        console.log('--- Step 2: Check Availability ---');
        await api(`/orders/${orderId}/check-availability`, { method: 'POST' });

        // 3. Create Shipment
        console.log('--- Step 3: Create Shipment ---');
        const shipRes = await api('/orders/ship', {
            method: 'POST',
            body: JSON.stringify({
                orderId: orderId,
                carrier: 'DHL',
                trackingId: 'TRK-987654321'
            })
        });
        console.log(`Shipment Status: ${shipRes.status}`);
        const shipmentId = shipRes.data.id;

        // 4. Test Scenario 16.1: Generate Shipping Label
        console.log('\n--- Scenario 16.1: Generate Shipping Label ---');
        const labelRes = await api(`/shipping/label/${shipmentId}`);
        console.log(`Status: ${labelRes.status}`);
        console.log(`Content-Type: ${labelRes.contentType}`);
        if (labelRes.status === 200 && labelRes.contentType === 'application/pdf') {
            console.log('PASS: Shipping Label PDF generated successfully');
        } else {
            console.log('FAIL: Failed to generate Shipping Label PDF');
            if (labelRes.data instanceof ArrayBuffer === false) console.log(`Error: ${JSON.stringify(labelRes.data)}`);
        }

        // 5. Test Scenario 16.2: Generate Packing Slip
        console.log('\n--- Scenario 16.2: Generate Packing Slip ---');
        const slipRes = await api(`/shipping/packing-slip/${orderId}`);
        console.log(`Status: ${slipRes.status}`);
        console.log(`Content-Type: ${slipRes.contentType}`);
        if (slipRes.status === 200 && slipRes.contentType === 'application/pdf') {
            console.log('PASS: Packing Slip PDF generated successfully');
        } else {
            console.log('FAIL: Failed to generate Packing Slip PDF');
            if (slipRes.data instanceof ArrayBuffer === false) console.log(`Error: ${JSON.stringify(slipRes.data)}`);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
