const API = 'http://127.0.0.1:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502';
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function uploadFile(poId, filePath, docType) {
    const FormData = require('form-data');
    const form = new FormData();
    const buffer = fs.readFileSync(filePath);
    form.append('file', buffer, { filename: path.basename(filePath), contentType: 'application/pdf' });
    form.append('documentType', docType);

    const res = await fetch(`${API}/purchase-orders/${poId}/documents`, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            'Content-Length': form.getLengthSync(),
            'x-user-id': USER_ID,
        },
        body: form.getBuffer()
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 9 PO Receiving & QA ===\n');

    try {
        // Find a PO that is RECEIVED or PARTIAL_RECEIVED or just any PO to test
        let po = await prisma.purchaseOrder.findFirst({
            include: { items: true }
        });

        if (!po) {
            console.log('No PO found. Creating one...');
            const supplier = await prisma.supplier.findFirst();
            const product = await prisma.product.findFirst();
            const warehouse = await prisma.warehouse.findFirst();

            const poRes = await api('/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: supplier.id,
                    warehouseId: warehouse.id,
                    items: [{ productId: product.id, quantity: 10, unitPrice: 100 }]
                })
            });
            po = poRes.data;
            // Approve and Receive
            await api(`/purchase-orders/${po.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: USER_ID }) });
            const loc = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, type: 'INTERNAL' } });
            await api(`/purchase-orders/${po.id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: loc.id, items: [{ productId: product.id, quantity: 10 }] }) });
            po = await prisma.purchaseOrder.findUnique({ where: { id: po.id }, include: { items: true } });
        }
        console.log(`Using PO: ${po.id} (Status: ${po.status})\n`);

        // Scenario 9.2: Upload Invoice
        console.log('--- Scenario 9.2: Upload Invoice ---');
        const invUpload = await uploadFile(po.id, 'mock_invoice.pdf', 'INVOICE');
        console.log(`Status: ${invUpload.status}`);
        if (invUpload.status === 201 || invUpload.status === 200) {
            console.log('PASS: Invoice uploaded');
        } else {
            console.log('FAIL:', JSON.stringify(invUpload.data));
        }
        console.log();

        // Scenario 9.3: Upload Delivery Note
        console.log('--- Scenario 9.3: Upload Delivery Note ---');
        const dnUpload = await uploadFile(po.id, 'mock_delivery_note.pdf', 'DELIVERY_NOTE');
        console.log(`Status: ${dnUpload.status}`);
        if (dnUpload.status === 201 || dnUpload.status === 200) {
            console.log('PASS: Delivery Note uploaded');
        } else {
            console.log('FAIL:', JSON.stringify(dnUpload.data));
        }
        console.log();

        // Scenario 9.4: Submit QA Inspection (All Accepted)
        console.log('--- Scenario 9.4: Submit QA Inspection (All Accepted) ---');
        const inspectionRes = await api(`/purchase-orders/${po.id}/inspections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: 'All items look good',
                results: po.items.map(item => ({
                    productId: item.productId,
                    receivedQty: item.quantity,
                    acceptedQty: item.quantity,
                    rejectedQty: 0
                }))
            })
        });
        console.log(`Status: ${inspectionRes.status}`);
        if (inspectionRes.status === 201 || inspectionRes.status === 200) {
            console.log('PASS: QA Inspection submitted');
        } else {
            console.log('FAIL:', JSON.stringify(inspectionRes.data));
        }
        console.log();

        // Scenario 9.6: Run 3-Way Match
        console.log('--- Scenario 9.6: Run 3-Way Match ---');
        const matchRes = await api(`/purchase-orders/${po.id}/match`, {
            method: 'POST'
        });
        console.log(`Status: ${matchRes.status}`);
        if (matchRes.status === 200 || matchRes.status === 201) {
            console.log('PASS: 3-Way Match executed');
            console.log('Result:', JSON.stringify(matchRes.data));
        } else {
            console.log('FAIL:', JSON.stringify(matchRes.data));
        }
        console.log();

        // Scenario 9.7: Verify Receipts Tab
        console.log('--- Scenario 9.7: Verify Receipts Tab ---');
        const receiptsRes = await api(`/purchase-orders/${po.id}/receipts`);
        console.log(`Status: ${receiptsRes.status}`);
        if (receiptsRes.status === 200) {
            console.log(`PASS: Receipts found (${receiptsRes.data.length})`);
        } else {
            console.log('FAIL:', JSON.stringify(receiptsRes.data));
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
