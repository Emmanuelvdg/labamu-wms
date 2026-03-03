// Phase 5 Fix: Set capacity limits and verify enforcement
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function run() {
    console.log('=== Phase 5 Fix: Capacity Limit ===\n');

    // 1. Set maxWeightKg on Bin 01
    const bin01 = await prisma.location.findFirst({ where: { name: 'Bin 01' } });
    console.log(`Bin 01 current maxWeightKg: ${bin01.maxWeightKg}`);

    await prisma.location.update({
        where: { id: bin01.id },
        data: { maxWeightKg: 500 } // 500 kg max
    });
    console.log('Updated Bin 01 maxWeightKg → 500 kg');

    // 2. Set weight on Pro Laptop X
    const laptop = await prisma.product.findFirst({ where: { name: 'Pro Laptop X' } });
    console.log(`Pro Laptop X current weight: ${laptop.weight}`);

    await prisma.product.update({
        where: { id: laptop.id },
        data: { weight: 2.5 } // 2.5 kg per unit
    });
    console.log('Updated Pro Laptop X weight → 2.5 kg\n');

    // 3. Test: Try adjustment of 5000 units (5000 × 2.5 = 12,500 kg > 500 kg limit)
    console.log('--- Test: Adjusting 5000 units (12,500 kg vs 500 kg limit) ---');
    const API = 'http://127.0.0.1:3001';
    const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';

    const adjResult = await fetch(`${API}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID },
        body: JSON.stringify({
            locationId: bin01.id,
            productId: laptop.id,
            currentQuantity: 0,
            countedQuantity: 5000,
            reason: 'Phase 5 Capacity Test',
            status: 'DRAFT'
        })
    });
    const adj = await adjResult.json();
    console.log(`Adjustment created: ${adjResult.status} (ID: ${adj.id?.substring(0, 8)}...)`);

    // Try to apply it — this should fail with capacity error
    const applyResult = await fetch(`${API}/inventory/adjustments/${adj.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID }
    });
    const applyData = await applyResult.text();
    console.log(`Apply status: ${applyResult.status}`);

    if (applyResult.status === 400) {
        console.log('PASS: Capacity limit enforced! Application rejected:');
        try { console.log(`  ${JSON.parse(applyData).message}`); } catch { console.log(`  ${applyData}`); }
    } else if (applyResult.status === 200 || applyResult.status === 201) {
        console.log('FAIL: Adjustment was applied despite exceeding capacity');
    } else {
        console.log(`Result: ${applyData}`);
    }

    // 4. Test: Small adjustment within limits (5 units = 12.5 kg < 500 kg)
    console.log('\n--- Test: Adjusting 5 units (12.5 kg vs 500 kg limit) ---');
    const smallAdj = await fetch(`${API}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID },
        body: JSON.stringify({
            locationId: bin01.id,
            productId: laptop.id,
            currentQuantity: 0,
            countedQuantity: 5,
            reason: 'Phase 5 Small Capacity Test',
            status: 'DRAFT'
        })
    });
    const smallAdjData = await smallAdj.json();

    const applySmall = await fetch(`${API}/inventory/adjustments/${smallAdjData.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID }
    });
    console.log(`Apply status: ${applySmall.status}`);
    if (applySmall.status === 200 || applySmall.status === 201) {
        console.log('PASS: Small adjustment accepted (within capacity)');
    } else {
        const txt = await applySmall.text();
        console.log(`Result: ${txt}`);
    }

    await prisma.$disconnect();
    console.log('\n=== Phase 5 Fix Complete ===');
}

run().catch(console.error);
