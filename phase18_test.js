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
    console.log('=== Phase 18 Notifications & Alerts ===\n');

    try {
        // 1. Trigger Expiry Check
        console.log('--- Scenario 18.4: Expiry Alert Generation ---');
        const checkRes = await api('/notifications/check-expiry?days=30', { method: 'POST' });
        console.log(`Status: ${checkRes.status}`);
        console.log(`Notifications Created: ${checkRes.data.notificationsCreated || 0}`);

        if (checkRes.status === 201 && checkRes.data.notificationsCreated > 0) {
            console.log('PASS: Expiry notification generated');

            // 2. Fetch Notifications
            console.log('\n--- Scenarios 18.2 & 18.3: Fetch Notifications ---');
            const notifRes = await api('/notifications');
            console.log(`Status: ${notifRes.status}`);

            const expiryNotif = notifRes.data.find(n => n.type === 'EXPIRY_WARNING');
            if (expiryNotif) {
                console.log(`PASS: Found EXPIRY_WARNING notification: "${expiryNotif.title}"`);
                console.log(`Body: ${expiryNotif.body}`);

                // 3. Mark as read
                console.log('\n--- Mark Notification as Read ---');
                const readRes = await api(`/notifications/${expiryNotif.id}/read`, { method: 'PATCH' });
                console.log(`Status: ${readRes.status}`);
                if (readRes.status === 200) {
                    console.log('PASS: Notification marked as read');
                } else {
                    console.log('FAIL: Failed to mark as read');
                }
            } else {
                console.log('FAIL: Could not find expiry notification in list');
            }
        } else {
            console.log('FAIL: No notifications created');
            console.log(`Data: ${JSON.stringify(checkRes.data)}`);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
