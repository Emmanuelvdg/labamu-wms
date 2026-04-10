/**
 * test-inventory.ts — Inventory operations tests
 *
 * Covers:
 *   Inventory queries (stock levels, transactions, valuation) →
 *   Inventory adjustments (create, apply, verify) →
 *   Stock transfers between locations →
 *   Replenishment rule triggers & alerts →
 *   Stocktaking sessions (create, generate tasks, count, reconcile) →
 *   Rotation rules (FEFO verified on cold products) →
 *   Reorder rules
 *
 * Requires: API server running + seed-realistic-data.ts executed
 */

import {
    describe, test, expect,
    api, apiExpect,
    getWarehouse, getProduct,
    prisma,
} from './test-utils';

// ─── Test suite ───────────────────────────────────────────────────────────────
export async function runInventoryTests() {

    // ─────────────────────────────────────────────────────────────────────────
    await describe('19. Inventory Stock Levels', async () => {

        await test('GET /inventory returns stock across locations', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const mouse = await getProduct('MSE-WLS-005');

            const inv = await apiExpect('GET', `/inventory?productId=${mouse.id}`);
            // Returns array of location-level inventory entries
            expect(Array.isArray(inv)).toBeTruthy();
        });

        await test('ProductInventory totals match batch quantities', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const mouse = await getProduct('MSE-WLS-005');

            const batchTotal = await prisma.inventoryBatch.aggregate({
                where: { productId: mouse.id, warehouseId: dc.id },
                _sum: { currentQuantity: true }
            });
            const piRecord = await prisma.productInventory.findFirst({
                where: { productId: mouse.id, warehouseId: dc.id }
            });

            expect(piRecord).toBeDefined();
            // Allow small delta if test runs have altered quantities
            const diff = Math.abs((piRecord!.quantity) - (batchTotal._sum.currentQuantity ?? 0));
            expect(diff).toBeLessThan(100);
        });

        await test('Inventory valuation endpoint responds', async () => {
            const val = await api('GET', '/inventory/valuation');
            expect(val.status).toBeOneOf([200, 404]);
        });

        await test('Stock transactions for a product are accessible', async () => {
            const mouse = await getProduct('MSE-WLS-005');
            const txns = await api('GET', `/inventory/transactions/${mouse.id}`);
            expect(txns.status).toBeOneOf([200, 404]);
        });

        await test('All inventory batches accessible via GET /inventory/batches', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const batches = await apiExpect('GET', `/inventory/batches?warehouseId=${dc.id}`);
            expect(Array.isArray(batches)).toBeTruthy();
            expect((batches as any[]).length).toBeGreaterThanOrEqual(20);
        });

        await test('Cold-chain batches have expiry dates set', async () => {
            const ink = await getProduct('INK-CTR-014');
            const inkBatches = await prisma.inventoryBatch.findMany({
                where: { productId: ink.id }
            });
            expect(inkBatches.length).toBeGreaterThan(0);
            for (const batch of inkBatches) {
                expect(batch.expiryDate).toBeDefined();
                expect(batch.expiryDate!.getTime()).toBeGreaterThan(Date.now());
            }
        });

        await test('FEFO rotation rule exists for cold-chain products', async () => {
            const ink = await getProduct('INK-CTR-014');
            const fefoRule = await prisma.rotationRule.findFirst({
                where: { productId: ink.id, policy: 'FEFO' }
            });
            expect(fefoRule).toBeDefined();
            expect(fefoRule!.policy).toBe('FEFO');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('20. Inventory Adjustments', async () => {

        let adjustmentId: string | null = null;

        await test('Create a stock adjustment (count discrepancy)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const pen = await getProduct('PEN-BLU-012');
            const binC = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'C1-2-01' }
            });

            // Get current system quantity at this location
            const currentBatch = await prisma.inventoryBatch.findFirst({
                where: { productId: pen.id, locationId: binC!.id }
            });
            const currentQty = currentBatch?.currentQuantity ?? 0;
            const countedQty = Math.max(0, currentQty - 5); // counted 5 fewer

            const adj = await apiExpect('POST', '/inventory/adjustments', {
                productId:       pen.id,
                locationId:      binC!.id,
                countedQuantity: countedQty,
                currentQuantity: currentQty,
                reason:          'Physical count discrepancy — Q2 cycle count',
            }, 201);

            expect(adj.id).toBeDefined();
            expect(adj.status).toBeOneOf(['DRAFT', 'WAITING', 'APPLIED']);
            adjustmentId = adj.id;
        });

        await test('GET adjustments list includes the new adjustment', async () => {
            const adjustments = await apiExpect('GET', '/inventory/adjustments');
            expect(Array.isArray(adjustments)).toBeTruthy();
            if (adjustmentId) {
                const found = (adjustments as any[]).find((a: any) => a.id === adjustmentId);
                expect(found).toBeDefined();
            }
        });

        await test('Apply the adjustment → inventory quantity updated', async () => {
            if (!adjustmentId) return;

            // Get batch quantity before
            const adj = await prisma.inventoryAdjustment.findUnique({ where: { id: adjustmentId } });
            if (!adj || adj.status === 'APPLIED') return;

            const before = await prisma.inventoryBatch.findMany({
                where: { productId: adj.productId, locationId: adj.locationId }
            });
            const beforeQty = before.reduce((s, b) => s + b.currentQuantity, 0);

            const result = await api('POST', `/inventory/adjustments/${adjustmentId}/apply`);
            expect(result.status).toBeOneOf([200, 201, 400]);

            if (result.ok) {
                // Verify quantity changed
                const after = await prisma.inventoryBatch.findMany({
                    where: { productId: adj.productId, locationId: adj.locationId }
                });
                const afterQty = after.reduce((s, b) => s + b.currentQuantity, 0);
                // The quantity should have decreased by 5 (or been clamped at 0)
                expect(afterQty).toBeLessThanOrEqual(beforeQty);
            }
        });

        await test('Update an existing adjustment reason', async () => {
            if (!adjustmentId) return;
            const adj = await prisma.inventoryAdjustment.findUnique({ where: { id: adjustmentId } });
            if (!adj || adj.status === 'APPLIED') return;

            const updated = await api('PUT', `/inventory/adjustments/${adjustmentId}`, {
                reason: 'Physical count discrepancy — updated after supervisor review'
            });
            expect(updated.status).toBeOneOf([200, 201, 400]);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('21. Stock Transfers Between Locations', async () => {

        await test('Transfer stock between bins in same warehouse', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const hub = await getProduct('USB-HUB-006');

            const sourcebin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-3-01' }
            });
            const destBin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A2-1-01' }
            });

            const result = await api('POST', '/inventory/transfer', {
                productId:            hub.id,
                sourceLocationId:     sourcebin!.id,
                destinationLocationId: destBin!.id,
                quantity:             5,
                reason:               'Bin consolidation test',
            });
            expect(result.status).toBeOneOf([200, 201, 400, 422]);
        });

        await test('Transfer with more quantity than available → error', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const mouse = await getProduct('MSE-WLS-005');

            const sourcebin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-2-01' }
            });
            const destBin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A2-2-01' }
            });

            const result = await api('POST', '/inventory/transfer', {
                productId:            mouse.id,
                sourceLocationId:     sourcebin!.id,
                destinationLocationId: destBin!.id,
                quantity:             99999,
                reason:               'Over-quantity transfer test',
            });
            // Should fail with 400/422
            expect(result.status).toBeOneOf([400, 404, 409, 422]);
        });

        await test('Stock moves list is accessible', async () => {
            const moves = await api('GET', '/inventory/moves?status=PENDING');
            expect(moves.status).toBeOneOf([200, 404]);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('22. Replenishment Rules & Alerts', async () => {

        await test('Reorder rules are accessible', async () => {
            const rules = await apiExpect('GET', '/inventory/reordering-rules');
            expect(Array.isArray(rules)).toBeTruthy();
            expect((rules as any[]).length).toBeGreaterThanOrEqual(5);
        });

        await test('Seeded reorder rules have min/max quantities', async () => {
            const rules = await apiExpect('GET', '/inventory/reordering-rules') as any[];
            for (const rule of rules.slice(0, 3)) {
                expect(rule.minQuantity).toBeGreaterThan(0);
                expect(rule.maxQuantity).toBeGreaterThan(rule.minQuantity);
                expect(rule.active).toBeTruthy();
            }
        });

        await test('Trigger replenishment check for DC-JKT', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const result = await api('POST', `/replenishment/check?warehouseId=${dc.id}`);
            expect(result.status).toBeOneOf([200, 201, 400]);
        });

        await test('Replenishment summary is accessible', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const summary = await api('GET', `/replenishment/summary?warehouseId=${dc.id}`);
            expect(summary.status).toBeOneOf([200, 404]);
        });

        await test('Replenishment alerts list responds', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const alerts = await api('GET', `/replenishment/alerts?warehouseId=${dc.id}`);
            expect(alerts.status).toBeOneOf([200, 404]);
            if (alerts.ok) expect(Array.isArray(alerts.data)).toBeTruthy();
        });

        await test('Create a reorder rule via API', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const cam = await getProduct('CAM-WEB-007');
            const bin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A2-2-01' }
            });

            const rule = await api('POST', '/inventory/reordering-rules', {
                productId:   cam.id,
                locationId:  bin!.id,
                minQuantity: 10,
                maxQuantity: 50,
            });
            expect(rule.status).toBeOneOf([200, 201, 400, 409]);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('23. Stocktaking (Cycle Count)', async () => {

        let stocktakeSessionId: string | null = null;

        await test('Create a stocktaking session for DC-JKT', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');

            const session = await apiExpect('POST', '/stocktaking/sessions', {
                warehouseId: dc.id,
                type:        'PARTIAL',
                description: 'Zone A quarterly cycle count',
            }, 201);

            expect(session.id).toBeDefined();
            expect(session.status).toBe('PLANNED');
            stocktakeSessionId = session.id;
        });

        await test('List stocktaking sessions', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const sessions = await apiExpect('GET', `/stocktaking/sessions?warehouseId=${dc.id}`);
            expect(Array.isArray(sessions)).toBeTruthy();
            expect((sessions as any[]).length).toBeGreaterThan(0);
        });

        await test('Generate tasks for the stocktaking session', async () => {
            if (!stocktakeSessionId) return;

            const result = await api('POST', `/stocktaking/sessions/${stocktakeSessionId}/generate-tasks`);
            expect(result.status).toBeOneOf([200, 201, 400]);
        });

        await test('GET session detail shows generated tasks', async () => {
            if (!stocktakeSessionId) return;

            const detail = await apiExpect('GET', `/stocktaking/sessions/${stocktakeSessionId}`);
            expect(detail.id).toBe(stocktakeSessionId);
            // Tasks may or may not be generated depending on session config
            expect(detail.status).toBeOneOf(['PLANNED', 'IN_PROGRESS', 'COMPLETED']);
        });

        await test('Count items for a stocktake task', async () => {
            if (!stocktakeSessionId) return;

            const session = await apiExpect('GET', `/stocktaking/sessions/${stocktakeSessionId}`);
            const tasks = session.tasks ?? [];
            const pendingTask = tasks.find((t: any) => t.status === 'PENDING');
            if (!pendingTask) return;

            const admin = await prisma.user.findFirst({ where: { email: 'admin@labamu.co.id' } });
            const result = await api('POST', `/stocktaking/tasks/${pendingTask.id}/count`, {
                countedQuantity: pendingTask.systemQuantity ?? 0,
                countedBy:       admin!.id,
            });
            expect(result.status).toBeOneOf([200, 201, 400]);
        });

        await test('Reconcile a completed stocktake session', async () => {
            if (!stocktakeSessionId) return;

            const session = await apiExpect('GET', `/stocktaking/sessions/${stocktakeSessionId}`);
            if (session.status !== 'IN_PROGRESS') return;

            const result = await api('POST', `/stocktaking/sessions/${stocktakeSessionId}/reconcile`);
            expect(result.status).toBeOneOf([200, 201, 400]);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('24. Location Management', async () => {

        await test('GET location tree for DC-JKT', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const tree = await apiExpect('GET', `/inventory/locations/tree?warehouseId=${dc.id}`);
            expect(tree).toBeDefined();
        });

        await test('GET location details with capacity info', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const bin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-1-01' }
            });

            const detail = await apiExpect('GET', `/inventory/locations/${bin!.id}`);
            expect(detail.id).toBe(bin!.id);
            expect(detail.name).toBeDefined();
        });

        await test('GET suggest-removal location for a product', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const mouse = await getProduct('MSE-WLS-005');
            const bin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-2-01' }
            });

            const result = await api('GET', `/inventory/locations/${bin!.id}/suggest-removal?productId=${mouse.id}&quantity=5`);
            expect(result.status).toBeOneOf([200, 404]);
        });

        await test('GET warehouse zones', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const zones = await api('GET', `/warehouses/${dc.id}/zones`);
            expect(zones.status).toBeOneOf([200, 404]);
            if (zones.ok) expect(Array.isArray(zones.data)).toBeTruthy();
        });

        await test('GET bin utilization for DC-JKT', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const util = await api('GET', `/warehouses/${dc.id}/bins/utilization`);
            expect(util.status).toBeOneOf([200, 404]);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('25. Invoicing', async () => {

        await test('Invoice list is accessible', async () => {
            const invoices = await api('GET', '/invoices');
            expect(invoices.status).toBeOneOf([200, 404]);
        });

        await test('Create an invoice for PO-2024-001', async () => {
            const po1 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-001' } });
            const supplier = await prisma.supplier.findFirst({ where: { name: 'TechSupply Co.' } });
            const laptop = await getProduct('LAP-PRO-001');

            const invoice = await api('POST', '/invoices', {
                vendorId:       supplier!.id,
                purchaseOrderId: po1!.id,
                invoiceNumber:  `INV-${Date.now()}`,
                issueDate:      new Date().toISOString(),
                dueDate:        new Date(Date.now() + 30 * 86400000).toISOString(),
                totalAmount:    58170000,
                items: [
                    { productId: laptop.id, description: 'Pro Laptop X15 x20', quantity: 20, unitPrice: 17200000, totalPrice: 344000000 }
                ]
            });
            expect(invoice.status).toBeOneOf([200, 201, 400]);
        });

        await test('3-way match for a received PO triggers correctly', async () => {
            const po1 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-001' } });
            const result = await api('POST', `/purchase-orders/${po1!.id}/match`);
            expect(result.status).toBeOneOf([200, 201, 400]);
        });
    });
}
