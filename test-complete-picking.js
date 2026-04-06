const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompletePicking() {
    try {
        console.log("Setting up test data...");
        
        let warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            warehouse = await prisma.warehouse.create({
                data: { name: 'Test Warehouse', type: 'STORAGE' }
            });
        }

        let product = await prisma.product.findFirst();
        if (!product) {
            product = await prisma.product.create({
                data: { name: 'Test Product', sku: 'TEST-SKU-' + Date.now(), category: 'General' }
            });
        }

        let location = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, type: 'STORAGE' } });
        if (!location) {
            location = await prisma.location.create({
                data: { name: 'Storage A', type: 'STORAGE', warehouseId: warehouse.id }
            });
        }

        console.log("Creating Order...");
        const order = await prisma.order.create({
            data: {
                status: 'RESERVED',
                priority: 'NORMAL',
                warehouseId: warehouse.id,
                totalAmount: 1500, // High value (> 1000)
                items: {
                    create: {
                        productId: product.id,
                        quantity: 10
                    }
                }
            }
        });

        console.log("Creating Picking Session...");
        const session = await prisma.pickingSession.create({
            data: {
                warehouseId: warehouse.id,
                strategy: 'SINGLE',
                status: 'IN_PROGRESS',
                tasks: {
                    create: {
                        orderId: order.id,
                        productId: product.id,
                        sourceLocationId: location.id,
                        quantity: 10,
                        pickedQuantity: 10,
                        status: 'PICKED'
                    }
                }
            }
        });

        console.log(`Created Session: ${session.id}. Now hitting API to complete...`);
        
        // Simulating the API call to localhost:3001/strategy/picking/sessions/${session.id}/complete
        // Since the server might not be fully ready or I don't want to rely on network, 
        // I will just check the logs or try to fetch if I can.
        
        const response = await fetch(`http://localhost:3001/strategy/picking/sessions/${session.id}/complete`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            console.log("API Result:", result);

            console.log("Verifying if a workflow instance was created for this order...");
            // Wait a bit for async logic if any
            await new Promise(r => setTimeout(r, 2000));

            const workflowInstance = await prisma.workflowInstance.findFirst({
                where: { triggerRef: order.id },
                include: { template: true }
            });

            if (workflowInstance) {
                console.log("SUCCESS: Workflow Instance created!");
                console.log("Template Name:", workflowInstance.template.name);
                console.log("Instance Context:", workflowInstance.context);
            } else {
                console.log("FAILURE: No Workflow Instance found for order.");
            }
        } else {
            console.error("API Call Failed:", response.status, await response.text());
        }

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testCompletePicking();
