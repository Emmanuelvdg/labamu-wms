const API = 'http://127.0.0.1:3001/inventory';
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
    console.log('=== Phase 11 Putaway & Picking Strategies ===\n');

    try {
        const product = await prisma.product.findFirst({ where: { sku: 'LAP-X' } });
        const warehouse = await prisma.warehouse.findFirst();
        const locations = await prisma.location.findMany({ where: { warehouseId: warehouse.id, type: 'INTERNAL' } });
        const bin01 = locations.find(l => l.name === 'Bin 01');
        const bin02 = locations.find(l => l.name === 'Bin 02') || locations[1];

        if (!product || !bin01 || !bin02) {
            console.log('Missing required data (Product or Bins)');
            return;
        }

        // Scenario 11.1: Create Putaway Rule (Fixed)
        console.log('--- Scenario 11.1: Create Putaway Rule (Fixed) ---');
        const ruleRes = await api('/putaway-rules', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Fixed Laptop Putaway',
                productId: product.id,
                warehouseId: warehouse.id,
                destinationLocationId: bin02.id,
                strategy: 'FIXED',
                priority: 100
            })
        });
        console.log(`Status: ${ruleRes.status}`);
        if (ruleRes.status === 201) {
            console.log('PASS: Fixed rule created');
            const ruleId = ruleRes.data.id;

            // Test Rule
            const testRes = await api('/putaway-rules/test', {
                method: 'POST',
                body: JSON.stringify({
                    productId: product.id,
                    quantity: 1,
                    warehouseId: warehouse.id
                })
            });
            console.log('Test Result Data:', JSON.stringify(testRes.data));
            if (testRes.data?.selectedLocation?.id === bin02.id) {
                console.log('PASS: Rule correctly suggested Bin 02');
            } else {
                console.log('FAIL: Suggested', testRes.data?.selectedLocation?.name || 'NOTHING');
            }

            // Scenario 11.3: Delete Rule
            await api(`/putaway-rules/${ruleId}`, { method: 'DELETE' });
            console.log('Scenario 11.3: Rule deleted');
        }

        // Scenario 11.4: Verify Picking Strategy (FIFO)
        console.log('\n--- Scenario 11.4: Verify Picking Strategy (FIFO) ---');
        // Set bin01 strategy to FIFO
        await prisma.location.update({ where: { id: bin01.id }, data: { removalStrategy: 'FIFO' } });

        // Ensure at least 2 batches in bin01
        // (This might already exist from previous tests, but let's assume we can check existing)
        const batches = await prisma.inventoryBatch.findMany({
            where: { locationId: bin01.id, productId: product.id, currentQuantity: { gt: 0 } },
            orderBy: { purchaseDate: 'asc' }
        });

        if (batches.length >= 2) {
            const { data: suggestions } = await api(`/locations/${bin01.id}/suggest-removal?productId=${product.id}&quantity=1`);
            if (suggestions && suggestions[0]?.batchId === batches[0].id) {
                console.log('PASS: FIFO strategy suggested oldest batch');
            } else {
                console.log('FAIL: Suggestions', JSON.stringify(suggestions));
            }
        } else {
            console.log('SKIP: Not enough batches for FIFO test');
        }

        // Scenario 11.5: Rotation Policy (FEFO)
        console.log('\n--- Scenario 11.5: Rotation Policy (FEFO) ---');
        await prisma.location.update({ where: { id: bin01.id }, data: { removalStrategy: 'FEFO' } });

        const fefoBatches = await prisma.inventoryBatch.findMany({
            where: { locationId: bin01.id, productId: product.id, currentQuantity: { gt: 0 } },
            orderBy: { expiryDate: 'asc' }
        });

        if (fefoBatches.length >= 1) {
            const { data: suggestions } = await api(`/locations/${bin01.id}/suggest-removal?productId=${product.id}&quantity=1`);
            if (suggestions && suggestions[0]?.batchId === fefoBatches[0].id) {
                console.log('PASS: FEFO strategy suggested batch with earliest expiry');
            } else {
                console.log('FAIL: Suggestions', JSON.stringify(suggestions));
            }
        } else {
            console.log('SKIP: No batches with expiry found');
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
