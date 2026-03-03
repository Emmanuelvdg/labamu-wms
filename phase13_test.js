// Phase 13 E2E Test Script - Returns, Invoices & Audit Trail
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
    console.log('=== Phase 13 E2E Test ===\n');

    const { PrismaClient } = require('@labamu/database');
    const prisma = new PrismaClient();

    try {
        // Get reference data
        const { data: products } = await api('/inventory/products');
        const laptop = products.find(p => p.name === 'Pro Laptop X');
        console.log(`Product: ${laptop.name} (${laptop.id})`);

        // Find an existing sales order (from Phase 4)
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { items: true }
        });
        let so = orders[0];
        if (!so) {
            console.log('No orders found. Creating one for testing...');
            so = await prisma.order.create({
                data: {
                    status: 'SHIPPED',
                    priority: 'NORMAL',
                    type: 'SALES',
                    items: {
                        create: [{
                            productId: laptop.id,
                            quantity: 5,
                        }]
                    }
                },
                include: { items: true }
            });
        }
        console.log(`Sales Order: ${so.id.substring(0, 8)}... (status: ${so.status})\n`);

        // === Scenario 13.1: Create Return Request (RMA) ===
        console.log('--- Scenario 13.1: Create Return Request (RMA) ---');
        const returnResult = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: so.id,
                items: [{
                    productId: laptop.id,
                    quantity: 1,
                    returnReason: 'Damaged'
                }]
            })
        });
        console.log(`Status: ${returnResult.status}`);
        if (returnResult.status === 201 || returnResult.status === 200) {
            console.log('PASS: Return request created');
            console.log(`  Return ID: ${returnResult.data.id}`);
            console.log(`  Status: ${returnResult.data.status}`);
        } else {
            console.log('FAIL:', JSON.stringify(returnResult.data));
        }
        const returnId = returnResult.data?.id;
        console.log();

        // === Scenario 13.2: Receive & Assess Return (DAMAGED) ===
        console.log('--- Scenario 13.2: Receive & Assess Return (DAMAGED) ---');
        if (returnId) {
            const receiveResult = await api(`/returns/${returnId}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{
                        productId: laptop.id,
                        quantity: 1,
                        condition: 'DAMAGED'
                    }]
                })
            });
            console.log(`Status: ${receiveResult.status}`);
            if (receiveResult.status === 200 || receiveResult.status === 201) {
                console.log('PASS: Return received and assessed as DAMAGED');
                console.log(`  Updated status: ${receiveResult.data.status || 'RECEIVED'}`);
            } else {
                console.log('FAIL:', JSON.stringify(receiveResult.data));
            }
        } else {
            console.log('SKIP: No returnId from 13.1');
        }
        console.log();

        // === Scenario 13.3: Receive Return (SELLABLE) ===
        console.log('--- Scenario 13.3: Receive Return (SELLABLE) ---');
        const return2 = await api('/returns', {
            method: 'POST',
            body: JSON.stringify({
                originalOrderId: so.id,
                items: [{
                    productId: laptop.id,
                    quantity: 1,
                    returnReason: 'Customer Changed Mind'
                }]
            })
        });
        if (return2.status === 201 || return2.status === 200) {
            const receiveResult2 = await api(`/returns/${return2.data.id}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{
                        productId: laptop.id,
                        quantity: 1,
                        condition: 'SELLABLE'
                    }]
                })
            });
            console.log(`Status: ${receiveResult2.status}`);
            if (receiveResult2.status === 200 || receiveResult2.status === 201) {
                console.log('PASS: Return received as SELLABLE — item should be restocked');
                console.log(`  Updated status: ${receiveResult2.data.status || 'RECEIVED'}`);
            } else {
                console.log('FAIL:', JSON.stringify(receiveResult2.data));
            }
        } else {
            console.log('FAIL: Could not create second return:', JSON.stringify(return2.data));
        }
        console.log();

        // === Scenario 13.4: Create Sales Invoice ===
        console.log('--- Scenario 13.4: Create Sales Invoice ---');
        // Get a supplier for the invoice (vendor invoice)
        const supplier = await prisma.supplier.findFirst();
        if (supplier) {
            const invoiceResult = await api('/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    invoiceNumber: `INV-${Date.now()}`,
                    vendorId: supplier.id,
                    totalAmount: 6000,
                    issueDate: new Date().toISOString(),
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    items: [{
                        description: 'Pro Laptop X - Batch delivery',
                        quantity: 5,
                        unitPrice: 1200,
                        totalPrice: 6000,
                        productId: laptop.id
                    }]
                })
            });
            console.log(`Status: ${invoiceResult.status}`);
            if (invoiceResult.status === 201 || invoiceResult.status === 200) {
                console.log('PASS: Invoice created');
                console.log(`  Invoice #: ${invoiceResult.data.invoiceNumber}`);
                console.log(`  Status: ${invoiceResult.data.status}`);
                console.log(`  Total: $${invoiceResult.data.totalAmount}`);
            } else {
                console.log('FAIL:', JSON.stringify(invoiceResult.data));
            }
        } else {
            console.log('SKIP: No supplier found for invoice creation');
        }
        console.log();

        // === Scenario 13.5: Verify Stock Moves (Audit Trail) ===
        console.log('--- Scenario 13.5: Verify Audit Trail (Stock Transactions) ---');
        const { data: transactions } = await api('/inventory/transactions');
        if (Array.isArray(transactions)) {
            console.log(`Total stock transactions: ${transactions.length}`);
            const types = {};
            transactions.forEach(t => { types[t.type] = (types[t.type] || 0) + 1; });
            console.log('Transaction types breakdown:');
            Object.entries(types).forEach(([type, count]) => console.log(`  ${type}: ${count}`));

            // Check for Pro Laptop X transactions
            const laptopTx = transactions.filter(t => t.productId === laptop.id);
            console.log(`\nPro Laptop X transactions: ${laptopTx.length}`);
            laptopTx.slice(0, 5).forEach(t => {
                console.log(`  ${t.type} | Qty: ${t.quantity} | Date: ${new Date(t.date).toLocaleDateString()}`);
            });
            if (laptopTx.length > 0) {
                console.log('PASS: Audit trail visible for Pro Laptop X');
            }
        } else {
            console.log('FAIL: Could not retrieve transactions:', JSON.stringify(transactions));
        }
        console.log();

        // === Scenario 13.6: Inventory Ledger Export ===
        console.log('--- Scenario 13.6: Inventory Ledger Export ---');
        // Check if the ledger API endpoint exists
        const ledgerResult = await api('/reporting/analytics/inventory-ledger?period=30d&limit=10');
        console.log(`Ledger API status: ${ledgerResult.status}`);
        if (ledgerResult.status === 200) {
            const ledgerData = ledgerResult.data;
            if (ledgerData.data && ledgerData.meta) {
                console.log(`PASS: Ledger API returns paginated data`);
                console.log(`  Total entries: ${ledgerData.meta.total}`);
                console.log(`  Sample entries: ${ledgerData.data.length}`);
            } else if (Array.isArray(ledgerData)) {
                console.log(`PASS: Ledger API returns data (${ledgerData.length} entries)`);
            } else {
                console.log(`PASS: Ledger endpoint accessible, data:`, JSON.stringify(ledgerData).substring(0, 200));
            }

            // Test CSV export
            const csvResult = await api('/reporting/analytics/inventory-ledger?format=csv&period=30d');
            console.log(`CSV export status: ${csvResult.status}`);
            if (csvResult.status === 200) {
                const csvPreview = typeof csvResult.data === 'string' ? csvResult.data.substring(0, 200) : JSON.stringify(csvResult.data).substring(0, 200);
                console.log(`PASS: CSV export available`);
                console.log(`  Preview: ${csvPreview}...`);
            } else {
                console.log(`INFO: CSV export returned ${csvResult.status}`);
            }
        } else {
            console.log('FAIL:', JSON.stringify(ledgerResult.data));
        }

    } catch (err) {
        console.log('ERROR:', err.message);
        console.log(err.stack);
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n=== Phase 13 Tests Complete ===');
}

run().catch(console.error);
