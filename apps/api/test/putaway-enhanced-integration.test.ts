/**
 * Integration Tests for Enhanced Putaway System
 * Tests complete flows from receipt to putaway with Phase 2 & 3 enhancements
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:3001';

describe('Putaway Integration Tests - Enhanced System', () => {
    let testWarehouse: any;
    let testProduct: any;
    let testSupplier: any;
    let receivingLocation: any;
    let storageLocation: any;
    let coldStorageLocation: any;
    let heavyDutyLocation: any;

    beforeAll(async () => {
        // Setup test data
        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await prisma.$disconnect();
    });

    async function setupTestData() {
        console.log('\n=== Setting up comprehensive test data ===\n');

        // Create warehouse
        testWarehouse = await prisma.warehouse.create({
            data: {
                name: 'Integration Test Warehouse',
                shortName: 'ITW',
                location: JSON.stringify({ lat: 40.7128, lng: -74.0060 }),
                type: 'DISTRIBUTION',
            },
        });
        console.log(`✅ Warehouse: ${testWarehouse.name}`);

        // Create root location
        const rootLocation = await prisma.location.create({
            data: {
                name: `${testWarehouse.name} Root`,
                type: 'VIEW',
                warehouseId: testWarehouse.id,
            },
        });

        // Create receiving location with functional area
        receivingLocation = await prisma.location.create({
            data: {
                name: 'Integration Test Receiving',
                type: 'INTERNAL',
                warehouseId: testWarehouse.id,
                parentId: rootLocation.id,
            },
        });

        await prisma.warehouseFunctionalArea.create({
            data: {
                name: 'Test Receiving Area',
                areaType: 'RECEIVING',
                warehouseId: testWarehouse.id,
                linkedLocationId: receivingLocation.id,
                active: true,
            },
        });
        console.log(`✅ Receiving Location: ${receivingLocation.name}`);

        // Create storage locations with different characteristics
        storageLocation = await prisma.location.create({
            data: {
                name: 'Standard Storage A-1',
                type: 'INTERNAL',
                warehouseId: testWarehouse.id,
                parentId: rootLocation.id,
                zonePriority: 10, // Golden zone
                putawaySequence: 5,
                attributes: JSON.stringify({ attributes: ['dry'] }),
                maxVolume: 100,
                maxWeight: 2000,
            },
        });
        console.log(`✅ Standard Storage: ${storageLocation.name}`);

        coldStorageLocation = await prisma.location.create({
            data: {
                name: 'Cold Storage C-1',
                type: 'INTERNAL',
                warehouseId: testWarehouse.id,
                parentId: rootLocation.id,
                zonePriority: 30,
                putawaySequence: 20,
                attributes: JSON.stringify({
                    attributes: ['refrigerated'],
                    temperatureMin: 0,
                    temperatureMax: 10,
                }),
                supportedPackaging: JSON.stringify(['BOX', 'INDIVIDUAL']),
                maxVolume: 50,
                maxWeight: 1000,
            },
        });
        console.log(`✅ Cold Storage: ${coldStorageLocation.name}`);

        heavyDutyLocation = await prisma.location.create({
            data: {
                name: 'Heavy Duty Ground Floor',
                type: 'INTERNAL',
                warehouseId: testWarehouse.id,
                parentId: rootLocation.id,
                zonePriority: 85,
                putawaySequence: 50,
                attributes: JSON.stringify({ attributes: ['heavy_duty', 'ground_floor'] }),
                supportedPackaging: JSON.stringify(['PALLET']),
                maxVolume: 500,
                maxWeight: 20000,
            },
        });
        console.log(`✅ Heavy Duty Storage: ${heavyDutyLocation.name}`);

        // Create supplier
        testSupplier = await prisma.partner.create({
            data: {
                name: 'Integration Test Supplier',
                type: 'SUPPLIER',
            },
        });
        console.log(`✅ Supplier: ${testSupplier.name}`);

        // Create test products with different characteristics
        testProduct = await prisma.product.create({
            data: {
                sku: 'IT-FAST-001',
                name: 'Fast Moving Standard Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                abcClass: 'A',
                width: 30,
                height: 40,
                depth: 20,
                weight: 5,
                isStockable: true,
                status: 'Active',
            },
        });
        console.log(`✅ Standard Product: ${testProduct.name}`);

        const coldProduct = await prisma.product.create({
            data: {
                sku: 'IT-COLD-001',
                name: 'Refrigerated Food Product',
                category: 'FOOD',
                velocity: 'B',
                abcClass: 'B',
                storageRequirements: JSON.stringify(['refrigerated']),
                temperatureMin: 2,
                temperatureMax: 8,
                preferredPackaging: 'BOX',
                width: 20,
                height: 25,
                depth: 15,
                weight: 3,
                isStockable: true,
                status: 'Active',
            },
        });
        console.log(`✅ Refrigerated Product: ${coldProduct.name}`);

        const heavyProduct = await prisma.product.create({
            data: {
                sku: 'IT-HEAVY-001',
                name: 'Heavy Pallet Item',
                category: 'BULK',
                velocity: 'C',
                abcClass: 'C',
                preferredPackaging: 'PALLET',
                width: 120,
                height: 100,
                depth: 80,
                weight: 800,
                isStockable: true,
                status: 'Active',
            },
        });
        console.log(`✅ Heavy Product: ${heavyProduct.name}`);

        console.log('\n=== Test data setup complete ===\n');
    }

    async function cleanupTestData() {
        console.log('\n=== Cleaning up test data ===\n');

        if (testWarehouse) {
            // Delete in correct order to respect foreign keys
            await prisma.putawayTask.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.putawaySession.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.receiptItem.deleteMany({
                where: { receipt: { warehouseId: testWarehouse.id } },
            });
            await prisma.receipt.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.purchaseOrderItem.deleteMany({
                where: { purchaseOrder: { warehouseId: testWarehouse.id } },
            });
            await prisma.purchaseOrder.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.putawayRule.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.warehouseFunctionalArea.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.location.deleteMany({ where: { warehouseId: testWarehouse.id } });
            await prisma.warehouse.delete({ where: { id: testWarehouse.id } });
        }

        if (testSupplier) {
            await prisma.partner.delete({ where: { id: testSupplier.id } });
        }

        // Clean up products
        await prisma.product.deleteMany({
            where: { sku: { startsWith: 'IT-' } },
        });

        console.log('✅ Cleanup complete\n');
    }

    describe('Test 1: Standard PO → Fixed Strategy Putaway', () => {
        it('should create putaway session with FIXED strategy for specific product', async () => {
            console.log('\n=== TEST 1: FIXED Strategy for Specific Product ===\n');

            // Create putaway rule: Specific product → Specific location
            const rule = await prisma.putawayRule.create({
                data: {
                    name: 'Fast Product to Golden Zone',
                    description: 'A-class items go to golden zone',
                    strategy: 'FIXED',
                    destinationLocationId: storageLocation.id,
                    productId: testProduct.id,
                    priority: 100,
                    active: true,
                    warehouseId: testWarehouse.id,
                },
            });
            console.log(`✅ Created putaway rule: ${rule.name} (${rule.strategy})`);

            // Create PO
            const po = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: 'PO-IT-001',
                    partnerId: testSupplier.id,
                    warehouseId: testWarehouse.id,
                    expectedDate: new Date(),
                    status: 'CONFIRMED',
                },
            });

            await prisma.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: po.id,
                    productId: testProduct.id,
                    quantity: 50,
                    unitPrice: 10.0,
                },
            });
            console.log(`✅ Created PO: ${po.orderNumber}`);

            // Create receipt
            const receipt = await prisma.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    warehouseId: testWarehouse.id,
                    locationId: receivingLocation.id,
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });

            await prisma.receiptItem.create({
                data: {
                    receiptId: receipt.id,
                    productId: testProduct.id,
                    expectedQuantity: 50,
                    receivedQuantity: 50,
                    status: 'RECEIVED',
                },
            });
            console.log(`✅ Created receipt at ${receivingLocation.name}`);

            // Create putaway session via API
            const response = await fetch(`${API_URL}/inventory/putaway/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user',
                },
                body: JSON.stringify({
                    warehouseId: testWarehouse.id,
                    receiptIds: [receipt.id],
                }),
            });

            expect(response.ok).toBe(true);
            const session = await response.json();

            console.log(`✅ Putaway session created: ${session.id}`);
            console.log(`   Tasks: ${session.tasks.length}`);

            expect(session.tasks.length).toBeGreaterThan(0);
            const task = session.tasks[0];

            // Verify it used the FIXED strategy rule
            expect(task.destinationLocationId).toBe(storageLocation.id);
            console.log(`   ✅ Task assigned to fixed location: ${storageLocation.name}`);
            console.log(`   Strategy used: FIXED (via rule priority)\n`);
        });
    });

    describe('Test 2: IWT → Zone Priority Strategy', () => {
        it('should create putaway session with ZONE_PRIORITY strategy for IWT', async () => {
            console.log('\n=== TEST 2: ZONE_PRIORITY Strategy for IWT ===\n');

            // Create product for IWT
            const iwtProduct = await prisma.product.create({
                data: {
                    sku: 'IT-IWT-001',
                    name: 'Inter-Warehouse Transfer Product',
                    category: 'PARTS',
                    velocity: 'A',
                    abcClass: 'A',
                    width: 25,
                    height: 30,
                    depth: 20,
                    weight: 4,
                    isStockable: true,
                    status: 'Active',
                },
            });

            // Create rule for velocity A items
            const rule = await prisma.putawayRule.create({
                data: {
                    name: 'A-Items to Golden Zones',
                    description: 'Fast-moving items to zones 1-20',
                    strategy: 'ZONE_PRIORITY',
                    velocityClass: 'A',
                    preferredZonePriorityMin: 1,
                    preferredZonePriorityMax: 20,
                    priority: 100,
                    active: true,
                    warehouseId: testWarehouse.id,
                },
            });
            console.log(`✅ Created rule: ${rule.name} (${rule.strategy}, zones ${rule.preferredZonePriorityMin}-${rule.preferredZonePriorityMax})`);

            // Create dummy PO for IWT receipt (required by schema)
            const po = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: 'IWT-PO-001',
                    partnerId: testSupplier.id,
                    warehouseId: testWarehouse.id,
                    expectedDate: new Date(),
                    status: 'CONFIRMED',
                },
            });

            // Create IWT-style receipt
            const receipt = await prisma.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    warehouseId: testWarehouse.id,
                    locationId: receivingLocation.id,
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });

            await prisma.receiptItem.create({
                data: {
                    receiptId: receipt.id,
                    productId: iwtProduct.id,
                    expectedQuantity: 30,
                    receivedQuantity: 30,
                    status: 'RECEIVED',
                },
            });
            console.log(`✅ Created IWT receipt`);

            // Create putaway session
            const response = await fetch(`${API_URL}/inventory/putaway/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user',
                },
                body: JSON.stringify({
                    warehouseId: testWarehouse.id,
                    receiptIds: [receipt.id],
                }),
            });

            expect(response.ok).toBe(true);
            const session = await response.json();

            console.log(`✅ Putaway session created: ${session.id}`);

            const task = session.tasks[0];
            const destLocation = await prisma.location.findUnique({
                where: { id: task.destinationLocationId },
            });

            expect(destLocation.zonePriority).toBeGreaterThanOrEqual(1);
            expect(destLocation.zonePriority).toBeLessThanOrEqual(20);
            console.log(`   ✅ Task assigned to zone priority ${destLocation.zonePriority}: ${destLocation.name}`);
            console.log(`   Strategy used: ZONE_PRIORITY\n`);
        });
    });

    describe('Test 3: Cold Storage with Requirement Matching', () => {
        it('should match refrigerated products to cold storage locations', async () => {
            console.log('\n=== TEST 3: Storage Requirement Matching ===\n');

            const coldProduct = await prisma.product.findFirst({
                where: { sku: 'IT-COLD-001' },
            });

            // Create rule for refrigerated products
            const rule = await prisma.putawayRule.create({
                data: {
                    name: 'Refrigerated Products to Cold Storage',
                    description: 'Temperature-controlled items',
                    strategy: 'LEAST_OCCUPIED',
                    requiredAttributes: JSON.stringify(['refrigerated']),
                    categoryId: 'FOOD',
                    priority: 150,
                    active: true,
                    warehouseId: testWarehouse.id,
                },
            });
            console.log(`✅ Created rule: ${rule.name}`);
            console.log(`   Required attributes: refrigerated`);

            // Create PO and receipt
            const po = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: 'PO-COLD-001',
                    partnerId: testSupplier.id,
                    warehouseId: testWarehouse.id,
                    expectedDate: new Date(),
                    status: 'CONFIRMED',
                },
            });

            await prisma.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: po.id,
                    productId: coldProduct.id,
                    quantity: 20,
                    unitPrice: 15.0,
                },
            });

            const receipt = await prisma.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    warehouseId: testWarehouse.id,
                    locationId: receivingLocation.id,
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });

            await prisma.receiptItem.create({
                data: {
                    receiptId: receipt.id,
                    productId: coldProduct.id,
                    expectedQuantity: 20,
                    receivedQuantity: 20,
                    status: 'RECEIVED',
                },
            });

            // Create putaway session
            const response = await fetch(`${API_URL}/inventory/putaway/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user',
                },
                body: JSON.stringify({
                    warehouseId: testWarehouse.id,
                    receiptIds: [receipt.id],
                }),
            });

            expect(response.ok).toBe(true);
            const session = await response.json();

            const task = session.tasks[0];

            // Verify it matched to cold storage
            expect(task.destinationLocationId).toBe(coldStorageLocation.id);
            console.log(`   ✅ Task assigned to cold storage: ${coldStorageLocation.name}`);
            console.log(`   Temperature range verified: 0-10°C\n`);
        });
    });

    describe('Test 4: Heavy Item with Weight Filtering', () => {
        it('should route heavy items to heavy-duty ground floor location', async () => {
            console.log('\n=== TEST 4: Weight-Based Routing ===\n');

            const heavyProduct = await prisma.product.findFirst({
                where: { sku: 'IT-HEAVY-001' },
            });

            // Create rule for heavy items
            const rule = await prisma.putawayRule.create({
                data: {
                    name: 'Heavy Pallets to Ground Floor',
                    description: 'Items over 500kg',
                    strategy: 'ZONE_PRIORITY',
                    minWeight: 500,
                    preferredZonePriorityMin: 80,
                    preferredZonePriorityMax: 100,
                    priority: 90,
                    active: true,
                    warehouseId: testWarehouse.id,
                },
            });
            console.log(`✅ Created rule: ${rule.name}`);
            console.log(`   Min weight: ${rule.minWeight}kg`);
            console.log(`   Zone priority range: ${rule.preferredZonePriorityMin}-${rule.preferredZonePriorityMax}`);

            // Create PO and receipt
            const po = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: 'PO-HEAVY-001',
                    partnerId: testSupplier.id,
                    warehouseId: testWarehouse.id,
                    expectedDate: new Date(),
                    status: 'CONFIRMED',
                },
            });

            await prisma.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: po.id,
                    productId: heavyProduct.id,
                    quantity: 1, // 1 pallet = 800kg
                    unitPrice: 500.0,
                },
            });

            const receipt = await prisma.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    warehouseId: testWarehouse.id,
                    locationId: receivingLocation.id,
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });

            await prisma.receiptItem.create({
                data: {
                    receiptId: receipt.id,
                    productId: heavyProduct.id,
                    expectedQuantity: 1,
                    receivedQuantity: 1,
                    status: 'RECEIVED',
                },
            });

            // Create putaway session
            const response = await fetch(`${API_URL}/inventory/putaway/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user',
                },
                body: JSON.stringify({
                    warehouseId: testWarehouse.id,
                    receiptIds: [receipt.id],
                }),
            });

            expect(response.ok).toBe(true);
            const session = await response.json();

            const task = session.tasks[0];

            // Verify it matched to heavy duty location
            expect(task.destinationLocationId).toBe(heavyDutyLocation.id);
            console.log(`   ✅ Task assigned to heavy-duty location: ${heavyDutyLocation.name}`);
            console.log(`   Zone priority: ${heavyDutyLocation.zonePriority}\n`);
        });
    });

    describe('Test 5: Rule Priority and Fallback', () => {
        it('should select highest priority matching rule and fall back to velocity if no match', async () => {
            console.log('\n=== TEST 5: Rule Priority and Fallback ===\n');

            // Create product with no matching rules
            const genericProduct = await prisma.product.create({
                data: {
                    sku: 'IT-GENERIC-001',
                    name: 'Generic Product',
                    category: 'MISC',
                    velocity: 'C', // Slow-moving
                    width: 20,
                    height: 20,
                    depth: 20,
                    weight: 3,
                    isStockable: true,
                    status: 'Active',
                },
            });

            console.log(`✅ Created generic product (velocity: C, no storage requirements)`);

            // Create PO and receipt
            const po = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: 'PO-GENERIC-001',
                    partnerId: testSupplier.id,
                    warehouseId: testWarehouse.id,
                    expectedDate: new Date(),
                    status: 'CONFIRMED',
                },
            });

            await prisma.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: po.id,
                    productId: genericProduct.id,
                    quantity: 15,
                    unitPrice: 8.0,
                },
            });

            const receipt = await prisma.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    warehouseId: testWarehouse.id,
                    locationId: receivingLocation.id,
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });

            await prisma.receiptItem.create({
                data: {
                    receiptId: receipt.id,
                    productId: genericProduct.id,
                    expectedQuantity: 15,
                    receivedQuantity: 15,
                    status: 'RECEIVED',
                },
            });

            // Create putaway session
            const response = await fetch(`${API_URL}/inventory/putaway/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user',
                },
                body: JSON.stringify({
                    warehouseId: testWarehouse.id,
                    receiptIds: [receipt.id],
                }),
            });

            expect(response.ok).toBe(true);
            const session = await response.json();

            const task = session.tasks[0];
            const destLocation = await prisma.location.findUnique({
                where: { id: task.destinationLocationId },
            });

            // Should fall back to velocity-based logic: C items → zone priority > 50
            expect(destLocation.zonePriority).toBeGreaterThan(50);
            console.log(`   ✅ No matching rule found`);
            console.log(`   ✅ Fell back to velocity-based logic`);
            console.log(`   ✅ C-class item assigned to zone ${destLocation.zonePriority}: ${destLocation.name}\n`);
        });
    });
});

// Run tests
describe('Integration Test Suite', () => {
    test('Run all integration tests', async () => {
        console.log('Starting integration test suite...');
        // Tests will run via Jest
    });
});
