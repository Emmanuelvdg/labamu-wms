const API = 'http://127.0.0.1:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

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
    console.log('=== Phase 13 Returns Fix ===\n');

    try {
        const warehouse = await prisma.warehouse.findFirst();
        const product = await prisma.product.findFirst();

        // 1. Find or Create a SHIPPED order
        let order = await prisma.order.findFirst({
            where: { status: 'SHIPPED', type: 'SALES' },
            include: { items: true }
        });

        if (!order) {
            console.log('No SHIPPED order found. Creating one...');
            order = await prisma.order.create({
                data: {
                    status: 'SHIPPED',
                    type: 'SALES',
                    priority: 'NORMAL',
                    warehouseId: warehouse.id,
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 2
                        }]
                    }
                },
                include: { items: true }
            });
        }
        console.log(`Using Order: ${order.id} (Status: ${order.status})\n`);

        // 2. Scenario 13.1 & 13.2: Create & Receive Return (DAMAGED)
        console.log('--- Scenario 13.2: Receive Return (DAMAGED) ---');
        const ret1 = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: order.id,
                items: [{ productId: product.id, quantity: 1, returnReason: 'Damaged' }]
            })
        });

        if (ret1.status === 201) {
            const returnId = ret1.data.id;
            console.log(`Return created: ${returnId}`);

            const recv1 = await api(`/returns/${returnId}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ productId: product.id, quantity: 1, condition: 'DAMAGED' }]
                })
            });
            console.log(`Receive status: ${recv1.status}`);
            if (recv1.status === 200 || recv1.status === 201) {
                console.log('PASS: Return received as DAMAGED');
            } else {
                console.log('FAIL:', JSON.stringify(recv1.data));
            }
        } else {
            console.log('FAIL to create return:', JSON.stringify(ret1.data));
        }
        console.log();

        // 3. Scenario 13.3: Create & Receive Return (SELLABLE)
        console.log('--- Scenario 13.3: Receive Return (SELLABLE) ---');
        const ret2 = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: order.id,
                items: [{ productId: product.id, quantity: 1, returnReason: 'Wrong Item' }]
            })
        });

        if (ret2.status === 201) {
            const returnId = ret2.data.id;
            console.log(`Return created: ${returnId}`);

            const recv2 = await api(`/returns/${returnId}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ productId: product.id, quantity: 1, condition: 'SELLABLE' }]
                })
            });
            console.log(`Receive status: ${recv2.status}`);
            if (recv2.status === 200 || recv2.status === 201) {
                console.log('PASS: Return received as SELLABLE');
            } else {
                console.log('FAIL:', JSON.stringify(recv2.data));
            }
        } else {
            console.log('FAIL to create return:', JSON.stringify(ret2.data));
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
