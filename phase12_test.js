const API = 'http://127.0.0.1:3001/stocktaking';
const INV_API = 'http://127.0.0.1:3001/inventory';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function api(baseUrl, path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 12 Stocktaking & Cycle Counting ===\n');

    try {
        const warehouse = await prisma.warehouse.findFirst();

        // Scenario 12.1: Create Stocktake Session
        console.log('--- Scenario 12.1: Create Stocktake Session ---');
        const sessionRes = await api(API, '/sessions', {
            method: 'POST',
            body: JSON.stringify({
                warehouseId: warehouse.id,
                type: 'CYCLE',
                description: 'Monthly Electronics Check'
            })
        });
        console.log(`Status: ${sessionRes.status}`);
        if (sessionRes.status !== 201) throw new Error('Failed to create session');
        const sessionId = sessionRes.data.id;
        console.log(`PASS: Session created (ID: ${sessionId})`);

        // Scenario 12.2: Generate Counting Tasks
        console.log('\n--- Scenario 12.2: Generate Counting Tasks ---');
        const genRes = await api(API, `/sessions/${sessionId}/generate-tasks`, { method: 'POST' });
        console.log(`Status: ${genRes.status}`);

        const detailsRes = await api(API, `/sessions/${sessionId}`);
        const tasks = detailsRes.data.tasks;
        console.log(`PASS: Generated ${tasks.length} tasks`);

        if (tasks.length === 0) {
            console.log('FAIL: No tasks generated. Make sure there is inventory in the warehouse.');
            return;
        }

        // Scenario 12.3: Count Variations
        console.log('\n--- Scenario 12.3: Count Variations ---');
        const task = tasks[0];
        console.log(`Counting task for ${task.product.name} at ${task.location.name}`);
        console.log(`System Qty: ${task.systemQuantity}`);

        const countedQty = task.systemQuantity + 5; // Create a variance
        const countRes = await api(API, `/tasks/${task.id}/count`, {
            method: 'POST',
            body: JSON.stringify({
                countedQuantity: countedQty,
                countedBy: 'Test Runner'
            })
        });
        console.log(`Status: ${countRes.status}`);
        if (countRes.status === 201 || countRes.status === 200) {
            console.log(`PASS: Count submitted with variance (+5)`);
        }

        // Scenario 12.4: Reconcile Adjustments
        console.log('\n--- Scenario 12.4: Reconcile Adjustments ---');
        const reconRes = await api(API, `/sessions/${sessionId}/reconcile`, { method: 'POST' });
        console.log(`Status: ${reconRes.status}`);
        console.log(`Reconciled Count: ${reconRes.data.reconciledCount}`);

        // Verify Adjustment in Inventory
        const adjRes = await api(INV_API, '/adjustments');
        const latestAdj = adjRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        if (latestAdj && latestAdj.reason.includes(sessionId)) {
            console.log('PASS: Adjustment automatically created for variance');
            console.log(`Reason: ${latestAdj.reason}`);
            console.log(`Counted: ${latestAdj.countedQuantity}, Current: ${latestAdj.currentQuantity}`);
        } else {
            console.log('FAIL: Could not find matching adjustment');
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
