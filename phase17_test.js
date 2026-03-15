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
    console.log('=== Phase 17 Multi-Warehouse Transfers ===\n');

    try {
        const product = await prisma.product.findFirst();
        const warehouses = await prisma.warehouse.findMany({ take: 2 });

        if (warehouses.length < 2) {
            console.log('FAIL: Need at least 2 warehouses for transfer test');
            return;
        }

        const sourceWarehouseId = warehouses[0].id;
        const destWarehouseId = warehouses[1].id;

        console.log(`Source Warehouse: ${warehouses[0].name} (${sourceWarehouseId})`);
        console.log(`Dest Warehouse: ${warehouses[1].name} (${destWarehouseId})`);

        // 1. Create Transfer Request
        console.log('\n--- Scenario 17.1: Create Transfer Request ---');
        const createRes = await api('/fulfillment/transfers', {
            method: 'POST',
            body: JSON.stringify({
                sourceWarehouseId,
                destinationWarehouseId: destWarehouseId,
                items: [{ productId: product.id, quantity: 10 }],
                initiatorId: USER_ID
            })
        });

        console.log(`Status: ${createRes.status}`);
        if (createRes.status === 201) {
            console.log('PASS: Transfer Request created');
            const transferId = createRes.data.id;

            // 2. Approve Transfer
            console.log('\n--- Scenario 17.2: Approve Transfer ---');
            const approveRes = await api(`/fulfillment/transfers/${transferId}/approve`, {
                method: 'PUT',
                body: JSON.stringify({ approverId: USER_ID })
            });

            console.log(`Status: ${approveRes.status}`);
            if (approveRes.status === 200) {
                console.log('PASS: Transfer Approved');

                // Verify in DB
                const dbOrder = await prisma.order.findUnique({
                    where: { id: transferId }
                });
                console.log(`Order Status in DB: ${dbOrder.status}`);
                console.log(`Order Type in DB: ${dbOrder.type}`);

                if (dbOrder.status === 'APPROVED' && dbOrder.type === 'TRANSFER') {
                    console.log('PASS: Order correctly updated in DB');
                } else {
                    console.log('FAIL: DB state mismatch');
                }
            } else {
                console.log('FAIL: Transfer approval failed');
            }
        } else {
            console.log('FAIL: Transfer creation failed');
            console.log(`Error: ${JSON.stringify(createRes.data)}`);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
