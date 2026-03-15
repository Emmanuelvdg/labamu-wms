const API_URL = 'http://127.0.0.1:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502'; // Admin
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 17 Replenishment Engine ===\n');

    try {
        const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } });

        // 1. Trigger Stock Check
        console.log('--- Scenario 17.1: Check Stock Levels (API) ---');
        const checkRes = await api('/replenishment/check', { method: 'POST' });
        console.log(`Status: ${checkRes.status}`);
        console.log(`New Alerts: ${checkRes.data.newAlerts || 0}`);

        // 2. Fetch Alerts
        console.log('\n--- Scenario 17.2: Verify Replenishment Alert ---');
        const alertsRes = await api('/replenishment/alerts?status=ACTIVE');
        const alert = alertsRes.data.find(a => a.productId === product.id);

        if (alert) {
            console.log(`PASS: Found alert for ${product.sku} (Current: ${alert.currentQty}, Threshold: ${alert.threshold})`);
            const alertId = alert.id;

            // 3. Auto-Create PO
            console.log('\n--- Scenario 17.3: Auto-Create PO from Alert ---');
            const poRes = await api(`/replenishment/alerts/${alertId}/auto-po`, { method: 'POST' });
            console.log(`Status: ${poRes.status}`);
            if (poRes.status === 201 && poRes.data.success) {
                console.log(`PASS: PO Created: ${poRes.data.purchaseOrder.id}`);

                // Verify alert status updated
                const updatedAlert = await prisma.replenishmentAlert.findUnique({ where: { id: alertId } });
                console.log(`Alert Status: ${updatedAlert.status}`);
                if (updatedAlert.status === 'PO_CREATED') {
                    console.log('PASS: Alert status correctly updated to PO_CREATED');
                } else {
                    console.log('FAIL: Alert status not updated');
                }
            } else {
                console.log('FAIL: PO creation failed');
                console.log(`Error: ${JSON.stringify(poRes.data)}`);
            }

            // 4. Dismiss another alert (if exists) or create one to dismiss
            console.log('\n--- Scenario 17.4: Dismiss Alert ---');
            // We'll just create a dummy alert to dismiss if needed, or use a new one
            const dismissRes = await api(`/replenishment/alerts/${alertId}/dismiss`, { method: 'POST' });
            console.log(`Status: ${dismissRes.status}`);
            if (dismissRes.status === 201) {
                console.log('PASS: Alert Dismissed');
            } else {
                console.log('FAIL: Alert dismissal failed');
            }

        } else {
            console.log(`FAIL: No active alert found for ${product.id}`);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
