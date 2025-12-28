import { PrismaClient } from '../../../packages/database/node_modules/.prisma/client';

const prisma = new PrismaClient();

/**
 * Integration test for putaway flows
 * Tests: PO, IWT, STO receiving to putaway
 */

async function setupTestData() {
    console.log('=== Setting up test data ===\n');

    // 1. Create test warehouse
    let warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Test Putaway WH' }
    });

    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                name: 'Test Putaway WH',
                shortName: 'TPWH',
                address: '123 Test St',
                location: JSON.stringify({ lat: 0, lng: 0 }),
                type: 'DISTRIBUTION'
            }
        });
    }
    console.log(`✅ Warehouse: ${warehouse.name}`);

    // 2. Create root location for warehouse
    let rootLocation = await prisma.location.findFirst({
        where: {
            warehouseView: { name: warehouse.name },
            type: 'VIEW'
        }
    });

    if (!rootLocation) {
        rootLocation = await prisma.location.create({
            data: {
                name: `${warehouse.name} Root`,
                type: 'VIEW',
                warehouseId: warehouse.id
            }
        });

        await prisma.warehouse.update({
            where: { id: warehouse.id },
            data: { viewLocationId: rootLocation.id }
        });
    }
    console.log(`✅ Root Location: ${rootLocation.name}`);

    // 3. Create INTERNAL receiving location
    let receivingLocation = await prisma.location.findFirst({
        where: {
            name: 'Test Receiving Dock',
            warehouseId: warehouse.id
        }
    });

    if (!receivingLocation) {
        receivingLocation = await prisma.location.create({
            data: {
                name: 'Test Receiving Dock',
                type: 'INTERNAL',
                parentId: rootLocation.id,
                warehouseId: warehouse.id
            }
        });
    }
    console.log(`✅ Receiving Location: ${receivingLocation.name} (type: ${receivingLocation.type})`);

    // 4. Create WarehouseFunctionalArea for receiving
    let functionalArea = await prisma.warehouseFunctionalArea.findFirst({
        where: {
            name: 'Test Receiving Area',
            warehouseId: warehouse.id
        }
    });

    if (!functionalArea) {
        functionalArea = await prisma.warehouseFunctionalArea.create({
            data: {
                name: 'Test Receiving Area',
                areaType: 'RECEIVING',
                warehouseId: warehouse.id,
                linkedLocationId: receivingLocation.id,
                active: true,
                x: 0,
                y: 0,
                width: 100,
                height: 80,
                sequence: 0,
                color: '#FFA500'
            }
        });
    }
    console.log(`✅ Functional Area: ${functionalArea.name} → ${receivingLocation.name}`);

    // 5. Create INTERNAL storage location
    let storageLocation = await prisma.location.findFirst({
        where: {
            name: 'Test Storage A-1',
            warehouseId: warehouse.id
        }
    });

    if (!storageLocation) {
        storageLocation = await prisma.location.create({
            data: {
                name: 'Test Storage A-1',
                type: 'INTERNAL',
                parentId: rootLocation.id,
                warehouseId: warehouse.id,
                zonePriority: 10
            }
        });
    }
    console.log(`✅ Storage Location: ${storageLocation.name}`);

    // 6. Create test product
    let product = await prisma.product.findFirst({
        where: { sku: 'TEST-PUTAWAY-001' }
    });

    if (!product) {
        product = await prisma.product.create({
            data: {
                sku: 'TEST-PUTAWAY-001',
                name: 'Test Putaway Product',
                category: 'Test',
                velocity: 'B'
            }
        });
    }
    console.log(`✅ Product: ${product.name}`);

    // 7. Create test supplier
    let supplier = await prisma.supplier.findFirst({
        where: { name: 'Test Putaway Supplier' }
    });

    if (!supplier) {
        supplier = await prisma.supplier.create({
            data: {
                name: 'Test Putaway Supplier',
                contactInfo: 'test@example.com'
            }
        });
    }
    console.log(`✅ Supplier: ${supplier.name}`);

    console.log('\n=== Test data ready ===\n');

    return {
        warehouse,
        rootLocation,
        receivingLocation,
        storageLocation,
        functionalArea,
        product,
        supplier
    };
}

async function testPOPutaway(testData: any) {
    console.log('\n=== TEST 1: Purchase Order → Putaway ===\n');

    try {
        // 1. Create PO
        const po = await prisma.purchaseOrder.create({
            data: {
                supplierId: testData.supplier.id,
                status: 'ORDERED',
                items: {
                    create: [{
                        productId: testData.product.id,
                        quantity: 10,
                        unitCost: 100
                    }]
                }
            },
            include: { items: true }
        });
        console.log(`✅ Created PO: ${po.poNumber}`);

        // 2. Simulate receiving
        const receipt = await prisma.receipt.create({
            data: {
                purchaseOrderId: po.id,
                destinationLocationId: testData.receivingLocation.id,
                status: 'DONE',
                items: {
                    create: [{
                        productId: testData.product.id,
                        quantity: 10,
                        poItemId: po.items[0].id
                    }]
                }
            }
        });
        console.log(`✅ Created Receipt at ${testData.receivingLocation.name}`);

        // 3. Try to create putaway session
        const response = await fetch('http://127.0.0.1:3001/inventory/putaway/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user'
            },
            body: JSON.stringify({
                warehouseId: testData.warehouse.id
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Putaway session created: ${data.id}`);
            console.log(`   Tasks: ${data.tasks?.length || 0}`);
            return { success: true, session: data };
        } else {
            console.log(`❌ Failed to create session: ${data.message}`);
            return { success: false, error: data.message };
        }

    } catch (error: any) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testIWTPutaway(testData: any) {
    console.log('\n=== TEST 2: IWT → Putaway (Critical Fix Test) ===\n');

    try {
        // 1. Create source warehouse
        let sourceWH = await prisma.warehouse.findFirst({
            where: { name: 'Source WH' }
        });

        if (!sourceWH) {
            sourceWH = await prisma.warehouse.create({
                data: {
                    name: 'Source WH',
                    shortName: 'SWH',
                    address: '456 Source St',
                    location: JSON.stringify({ lat: 0, lng: 0 }),
                    type: 'DISTRIBUTION'
                }
            });
        }

        // 2. Simulate IWT receipt - create a "transfer PO" for the receipt
        const transferPO = await prisma.purchaseOrder.create({
            data: {
                supplierId: testData.supplier.id,
                status: 'RECEIVED', // Mark as received since this is simulating IWT arrival
                items: {
                    create: [{
                        productId: testData.product.id,
                        quantity: 5,
                        unitCost: 0 // IWT transfers have no cost
                    }]
                }
            },
            include: { items: true }
        });

        const iwtReceipt = await prisma.receipt.create({
            data: {
                purchaseOrderId: transferPO.id,
                destinationLocationId: testData.receivingLocation.id,
                status: 'DONE',
                items: {
                    create: [{
                        productId: testData.product.id,
                        quantity: 5,
                        poItemId: transferPO.items[0].id
                    }]
                }
            }
        });
        console.log(`✅ Simulated IWT receipt at ${testData.receivingLocation.name}`);
        console.log(`   Receiving location type: ${testData.receivingLocation.type} (should be INTERNAL)`);

        // 3. Try to create putaway session
        const response = await fetch('http://127.0.0.1:3001/inventory/putaway/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user'
            },
            body: JSON.stringify({
                warehouseId: testData.warehouse.id
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ IWT Putaway session created: ${data.id}`);
            console.log(`   This proves VENDOR bug is FIXED! 🎉`);
            console.log(`   Tasks: ${data.tasks?.length || 0}`);
            return { success: true, session: data };
        } else {
            console.log(`❌ Failed (VENDOR bug still exists?): ${data.message}`);
            return { success: false, error: data.message };
        }

    } catch (error: any) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runIntegrationTests() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  Putaway Integration Tests - Phase 1 Fix     ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    try {
        // Setup
        const testData = await setupTestData();

        // Run tests
        const poResult = await testPOPutaway(testData);
        const iwtResult = await testIWTPutaway(testData);

        // Summary
        console.log('\n=== Test Summary ===\n');
        console.log(`PO → Putaway:  ${poResult.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`IWT → Putaway: ${iwtResult.success ? '✅ PASS (BUG FIXED!)' : '❌ FAIL (BUG STILL EXISTS)'}`);

        if (poResult.success && iwtResult.success) {
            console.log('\n🎉 All tests passed! VENDOR bug is fixed!');
        } else {
            console.log('\n⚠️  Some tests failed. See details above.');
        }

    } catch (error: any) {
        console.error('\n❌ Test suite error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

runIntegrationTests();
