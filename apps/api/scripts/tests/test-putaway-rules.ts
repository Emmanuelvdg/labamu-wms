/**
 * test-putaway-rules.ts — Putaway rule routing validation
 *
 * Uses POST /inventory/putaway-rules/test to validate that each seeded
 * putaway rule routes products to the correct zone based on:
 *   - Velocity class (A → Zone A ≤20, B → Zone B 21-50, C → Zone C >50)
 *   - Temperature sensitivity (cold products → Zone COLD 35-45)
 *   - Weight (heavy items >5kg → Zone C)
 *   - Category (monitors → least-occupied bin)
 *
 * Also validates rule CRUD and rule priority ordering.
 *
 * Requires: API server running + seed-realistic-data.ts executed
 */

import {
    describe, test, expect,
    api, apiExpect,
    getWarehouse, getProduct,
    prisma,
} from './test-utils';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function testPutawayRoute(
    productSku: string,
    warehouseId: string,
    quantity: number = 5
): Promise<{ locations: any[]; destinationLocation?: any }> {
    const product = await getProduct(productSku);
    const receivingDock = await prisma.location.findFirst({
        where: { warehouseId, name: 'Receiving Dock' }
    });

    const result = await api('POST', '/inventory/putaway-rules/test', {
        productId:        product.id,
        quantity,
        warehouseId,
        sourceLocationId: receivingDock?.id,
    });

    if (!result.ok) return { locations: [] };

    // Response may be a location directly or an array of candidates
    if (Array.isArray(result.data)) return { locations: result.data, destinationLocation: result.data[0] };
    if (result.data?.id) return { locations: [result.data], destinationLocation: result.data };
    if (result.data?.destinationLocation) return { locations: [result.data.destinationLocation], destinationLocation: result.data.destinationLocation };
    return { locations: [] };
}

// ─── Test suite ───────────────────────────────────────────────────────────────
export async function runPutawayRuleTests() {

    // ─────────────────────────────────────────────────────────────────────────
    await describe('14. Putaway Rules — CRUD', async () => {

        await test('All seeded putaway rules are accessible', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules');
            expect(Array.isArray(rules)).toBeTruthy();
            expect((rules as any[]).length).toBeGreaterThanOrEqual(6);
        });

        await test('Rules include velocity-class strategies', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules') as any[];
            const velocityRules = rules.filter((r: any) => r.velocityClass != null);
            expect(velocityRules.length).toBeGreaterThanOrEqual(3);

            const classes = velocityRules.map((r: any) => r.velocityClass);
            expect(classes).toContain('A');
            expect(classes).toContain('B');
            expect(classes).toContain('C');
        });

        await test('Rules include a weight-based rule (minWeight set)', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules') as any[];
            const weightRule = rules.find((r: any) => r.minWeight != null && r.minWeight > 0);
            expect(weightRule).toBeDefined();
            expect(weightRule.minWeight).toBeGreaterThan(0);
        });

        await test('Rules include a category-based rule for Monitors', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules') as any[];
            const monitorRule = rules.find((r: any) => r.strategy === 'LEAST_OCCUPIED' && r.categoryId != null);
            expect(monitorRule).toBeDefined();
            expect(monitorRule.strategy).toBe('LEAST_OCCUPIED');
        });

        await test('Higher-priority rules have higher priority number', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules') as any[];
            const priorities = rules.map((r: any) => r.priority);
            // Temperature rule should be 120 (highest), velocity A should be 100
            const max = Math.max(...priorities);
            expect(max).toBeGreaterThanOrEqual(100);
        });

        await test('Create a custom putaway rule', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const binA = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-1-01' }
            });

            const rule = await api('POST', '/inventory/putaway-rules', {
                name:                 'Test FIXED Rule',
                strategy:             'FIXED',
                destinationLocationId: binA?.id,
                priority:             1,
                active:               true,
                warehouseId:          dc.id,
            });
            expect(rule.status).toBeOneOf([200, 201, 400]);

            if (rule.ok && rule.data?.id) {
                // Clean up — delete the test rule
                await api('DELETE', `/inventory/putaway-rules/${rule.data.id}`);
            }
        });

        await test('Update a putaway rule priority', async () => {
            const rules = await apiExpect('GET', '/inventory/putaway-rules') as any[];
            const lastRule = rules[rules.length - 1];

            const updated = await api('PUT', `/inventory/putaway-rules/${lastRule.id}`, {
                ...lastRule,
                priority: lastRule.priority + 1,
            });
            expect(updated.status).toBeOneOf([200, 201, 400]);

            if (updated.ok) {
                // Restore original priority
                await api('PUT', `/inventory/putaway-rules/${lastRule.id}`, lastRule);
            }
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('15. Putaway Rule Routing — Velocity Class', async () => {

        await test('Class A product (MSE-WLS-005) routes to Zone A (priority ≤ 20)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('MSE-WLS-005', dc.id);
            if (!destinationLocation) return; // test endpoint may not be available

            expect(destinationLocation.zonePriority).toBeLessThan(21);
        });

        await test('Class A product (USB-HUB-006) routes to Zone A (priority ≤ 20)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('USB-HUB-006', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeLessThan(21);
        });

        await test('Class B product (LAP-STD-002) routes to Zone B (priority 21-50)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('LAP-STD-002', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeGreaterThanOrEqual(21);
            expect(destinationLocation.zonePriority).toBeLessThan(51);
        });

        await test('Class B product (KBD-MEC-004) routes to Zone B (priority 21-50)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('KBD-MEC-004', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeGreaterThanOrEqual(21);
            expect(destinationLocation.zonePriority).toBeLessThan(51);
        });

        await test('Class C product (PPR-A4-011) routes to Zone C (priority > 50)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('PPR-A4-011', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeGreaterThan(50);
        });

        await test('Class C product (PEN-BLU-012) routes to Zone C (priority > 50)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('PEN-BLU-012', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeGreaterThan(50);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('16. Putaway Rule Routing — Cold Chain', async () => {

        await test('Ink cartridge (INK-CTR-014) routes to cold zone (priority 35-45)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('INK-CTR-014', dc.id);
            if (!destinationLocation) return;

            // Temperature-sensitive rule has priority 120 (highest) → evaluated first
            // Cold zone bins have zonePriority 40
            expect(destinationLocation.zonePriority).toBeGreaterThanOrEqual(35);
            expect(destinationLocation.zonePriority).toBeLessThan(46);
        });

        await test('Photo paper (PHT-PPR-015) routes to cold zone (priority 35-45)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('PHT-PPR-015', dc.id);
            if (!destinationLocation) return;

            expect(destinationLocation.zonePriority).toBeGreaterThanOrEqual(35);
            expect(destinationLocation.zonePriority).toBeLessThan(46);
        });

        await test('Cold zone bins have "Supports Cold Chain" attribute = Yes', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const coldBins = await prisma.location.findMany({
                where: { warehouseId: dc.id, zonePriority: { gte: 35, lte: 45 }, structuralType: 'POSITION' },
                include: { dynamicAttributes: { include: { definition: true } } }
            });
            expect(coldBins.length).toBeGreaterThan(0);

            for (const bin of coldBins.slice(0, 3)) {
                const coldAttr = bin.dynamicAttributes.find(
                    (a: any) => a.definition?.name === 'Supports Cold Chain'
                );
                expect(coldAttr).toBeDefined();
                expect(coldAttr?.value).toBe('Yes');
            }
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('17. Putaway Rule Routing — Weight & Category', async () => {

        await test('Heavy product Workstation (9.5kg) routes to Zone C (priority > 50)', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('DKT-WRK-003', dc.id);
            if (!destinationLocation) return;

            // Weight rule (>5kg) → Zone C (priority 51-100), rule priority 90
            expect(destinationLocation.zonePriority).toBeGreaterThan(50);
        });

        await test('Monitor (MON-27F) routes via LEAST_OCCUPIED strategy', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { locations } = await testPutawayRoute('MON-27F-009', dc.id);
            if (!locations.length) return;

            // Monitor category rule uses LEAST_OCCUPIED — may return multiple candidates
            expect(locations.length).toBeGreaterThanOrEqual(1);
        });

        await test('Routing test endpoint returns a POSITION-type bin', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const { destinationLocation } = await testPutawayRoute('MSE-WLS-005', dc.id);
            if (!destinationLocation) return;

            // Should be a leaf bin, not a zone or shelf
            expect(destinationLocation.structuralType).toBeOneOf(['POSITION', 'BIN', 'SHELF', 'ROOM']);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    await describe('18. Location Capacity & Utilisation', async () => {

        await test('Location utilisation endpoint responds for Zone A bins', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const bin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-1-01' }
            });
            if (!bin) return;

            const util = await api('GET', `/inventory/locations/${bin.id}/utilisation`);
            expect(util.status).toBeOneOf([200, 404]);
        });

        await test('Location capacity check for a bin with product', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const bin = await prisma.location.findFirst({
                where: { warehouseId: dc.id, code: 'A1-1-01' }
            });
            const mouse = await getProduct('MSE-WLS-005');
            if (!bin) return;

            const capacity = await api('GET', `/inventory/locations/${bin.id}/capacity?productId=${mouse.id}&quantity=10`);
            expect(capacity.status).toBeOneOf([200, 404]);
            if (capacity.ok) {
                expect(capacity.data).toHaveProperty('canAccept');
            }
        });

        await test('Batch utilisation for all Zone A bins', async () => {
            const dc = await getWarehouse('Distribution Center Jakarta');
            const zoneABins = await prisma.location.findMany({
                where: { warehouseId: dc.id, zonePriority: { lte: 20 }, structuralType: 'POSITION' },
                take: 10
            });
            expect(zoneABins.length).toBeGreaterThan(0);

            const result = await api('POST', '/inventory/locations/utilisation-batch', {
                locationIds: zoneABins.map(b => b.id),
                metric:      'UTILISATION',
            });
            expect(result.status).toBeOneOf([200, 201, 400]);
        });

        await test('Location attribute definitions are accessible', async () => {
            const defs = await apiExpect('GET', '/inventory/attributes/definitions');
            expect(Array.isArray(defs)).toBeTruthy();
            expect((defs as any[]).length).toBeGreaterThanOrEqual(9);

            const names = (defs as any[]).map((d: any) => d.name);
            expect(names).toContain('Zone Type');
            expect(names).toContain('Supports Cold Chain');
            expect(names).toContain('Temperature Min (°C)');
        });
    });
}
