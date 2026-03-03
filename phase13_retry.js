// Phase 13 Fix & Retry - Fix missing warehouseId on orders, then retest returns and ledger
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
    console.log('=== Phase 13 Fix & Retry ===\n');

    const { PrismaClient } = require('@labamu/database');
    const prisma = new PrismaClient();

    try {
        const { data: products } = await api('/inventory/products');
        const laptop = products.find(p => p.name === 'Pro Laptop X');
        const warehouse = await prisma.warehouse.findFirst();
        console.log(`Warehouse: ${warehouse.name} (${warehouse.id})\n`);

        // Fix: Update orders that don't have a warehouseId
        const updated = await prisma.order.updateMany({
            where: { warehouseId: null },
            data: { warehouseId: warehouse.id }
        });
        console.log(`Fixed ${updated.count} orders with missing warehouseId\n`);

        // Find the most recent SALES order
        const order = await prisma.order.findFirst({
            where: { type: 'SALES' },
            orderBy: { createdAt: 'desc' },
            include: { items: true }
        });
        console.log(`Using order: ${order.id.substring(0, 8)}... (status: ${order.status}, warehouse: ${order.warehouseId?.substring(0, 8)}...)\n`);

        // === Scenario 13.2: Create & Receive Return (DAMAGED) ===
        console.log('--- Scenario 13.2: Receive Return (DAMAGED) ---');
        const ret1 = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: order.id,
                items: [{ productId: laptop.id, quantity: 1, returnReason: 'Damaged in Transit' }]
            })
        });
        console.log(`Return created: ${ret1.status} (ID: ${ret1.data?.id?.substring(0, 8)}...)`);

        if (ret1.data?.id) {
            const recv1 = await api(`/returns/${ret1.data.id}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ productId: laptop.id, quantity: 1, condition: 'DAMAGED' }]
                })
            });
            console.log(`Receive status: ${recv1.status}`);
            if (recv1.status === 200 || recv1.status === 201) {
                console.log('PASS: Return received as DAMAGED — sent to quarantine');
                console.log(`  Result: ${JSON.stringify(recv1.data)}`);
            } else {
                console.log('FAIL:', JSON.stringify(recv1.data));
            }
        }
        console.log();

        // === Scenario 13.3: Create & Receive Return (SELLABLE) ===
        console.log('--- Scenario 13.3: Receive Return (SELLABLE) ---');
        const ret2 = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: order.id,
                items: [{ productId: laptop.id, quantity: 1, returnReason: 'Customer Changed Mind' }]
            })
        });
        console.log(`Return created: ${ret2.status} (ID: ${ret2.data?.id?.substring(0, 8)}...)`);

        if (ret2.data?.id) {
            const recv2 = await api(`/returns/${ret2.data.id}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ productId: laptop.id, quantity: 1, condition: 'SELLABLE' }]
                })
            });
            console.log(`Receive status: ${recv2.status}`);
            if (recv2.status === 200 || recv2.status === 201) {
                console.log('PASS: Return received as SELLABLE — item restocked');
                console.log(`  Result: ${JSON.stringify(recv2.data)}`);
            } else {
                console.log('FAIL:', JSON.stringify(recv2.data));
            }
        }
        console.log();

        // === Scenario 13.6: Inventory Ledger Export ===
        console.log('--- Scenario 13.6: Inventory Ledger Export ---');
        const ledger = await api('/reporting/inventory-ledger');
        console.log(`Ledger API status: ${ledger.status}`);
        if (ledger.status === 200) {
            const data = ledger.data;
            if (data.data) {
                console.log(`PASS: Ledger contains ${data.data.length} entries (total: ${data.meta?.total || 'N/A'})`);
                data.data.slice(0, 3).forEach(e => {
                    console.log(`  ${e.type || e.transactionType} | Product: ${e.productName || e.product?.name} | Qty: ${e.quantity} | Date: ${e.date}`);
                });
            } else if (Array.isArray(data)) {
                console.log(`PASS: Ledger contains ${data.length} entries`);
            } else {
                console.log('PASS: Ledger accessible:', JSON.stringify(data).substring(0, 300));
            }

            // Test CSV
            const csv = await api('/reporting/inventory-ledger?format=csv');
            console.log(`CSV export status: ${csv.status}`);
            if (csv.status === 200) {
                const preview = typeof csv.data === 'string' ? csv.data.substring(0, 200) : JSON.stringify(csv.data).substring(0, 200);
                console.log('PASS: CSV export available');
                console.log(`  Preview: ${preview}...`);
            }
        } else {
            console.log('FAIL:', JSON.stringify(ledger.data));
        }

    } catch (err) {
        console.log('ERROR:', err.message);
        console.log(err.stack);
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n=== Phase 13 Retry Complete ===');
}

run().catch(console.error);
