
import { PrismaClient } from '@labamu/database';
// Mock services
const prisma = new PrismaClient();

// Minimal InventoryService Mock
class InventoryServiceMock {
    constructor(private prisma: PrismaClient) { }
    async findProductStockLocations(productId: string) {
        const inventory = await this.prisma.productInventory.findMany({
            where: { productId, quantity: { gt: 0 } },
            orderBy: { quantity: 'desc' },
            include: { warehouse: true }
        });
        return inventory.map(inv => ({
            warehouseId: inv.warehouseId,
            quantity: inv.quantity,
            available: inv.quantity - inv.reserved
        }));
    }
}

// FulfillmentService setup
import { FulfillmentService } from '../src/fulfillment/fulfillment.service';

/**
 * Scenario 5.5: Auto-IWT from Sales Order (Direct)
 */
async function main() {
    console.log('--- Starting Auto-IWT Verification (Direct) ---');

    const inventoryService = new InventoryServiceMock(prisma) as any;
    const service = new FulfillmentService(prisma as any, inventoryService);

    try {
        // 1. Setup Data
        const whA = await prisma.warehouse.findFirst({ where: { name: 'Main Warehouse' } });
        const whB = await prisma.warehouse.findFirst({ where: { name: 'E2E Warehouse' } });

        if (!whA || !whB) throw new Error('Missing warehouses');

        const product = await prisma.product.findFirst({ where: { sku: 'E2E-PROD-NEW' } });
        if (!product) throw new Error('Missing product');

        // Check Stock
        const stockA = await prisma.productInventory.findFirst({ where: { warehouseId: whA.id, productId: product.id } });
        const qtyA = (stockA?.quantity || 0);

        const stockB = await prisma.productInventory.findFirst({ where: { warehouseId: whB.id, productId: product.id } });
        const qtyB = (stockB?.quantity || 0);
        const availB = qtyB - (stockB?.reserved || 0);

        console.log(`State: WhA (Main) Qty=${qtyA}, WhB (E2E) Avail=${availB}`);

        if (availB < 5) throw new Error('Not enough stock in Source (WhB) to test transfer');

        // 2. Ensure/Create Rule: WhA -> TRIGGER_TRANSFER
        const ruleName = 'E2E-Auto-IWT-Rule';
        let rule = await prisma.fulfillmentRule.findFirst({ where: { name: ruleName } });

        if (!rule) {
            rule = await prisma.fulfillmentRule.create({
                data: {
                    name: ruleName,
                    active: true,
                    priority: 1,
                    strategy: 'FIXED',
                    warehouseId: whA.id,
                    actionIfUnavailable: 'TRIGGER_TRANSFER',
                    transferSourceRule: JSON.stringify({ warehouseId: whB.id })
                }
            });
            console.log('Rule Created.');
        } else {
            await prisma.fulfillmentRule.update({
                where: { id: rule.id },
                data: {
                    active: true,
                    priority: 1,
                    warehouseId: whA.id,
                    actionIfUnavailable: 'TRIGGER_TRANSFER',
                    transferSourceRule: JSON.stringify({ warehouseId: whB.id })
                }
            });
            console.log('Rule Updated.');
        }

        // 3. Create Sales Order
        console.log('Creating Sales Order...');
        const order = await prisma.order.create({
            data: {
                type: 'SALES',
                status: 'PENDING',
                priority: 'NORMAL',
                fulfillmentStatus: 'UNALLOCATED',
                items: {
                    create: [{ productId: product.id, quantity: 5 }]
                }
            },
            include: { items: true }
        });
        console.log(`Order Created: ${order.id}`);

        // 4. Trigger Allocation
        console.log('Triggering Allocation...');
        await service.allocateOrder(order.id);

        // 5. Verify Results
        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        console.log(`Order Status: ${updatedOrder?.status}, Fulfillment: ${updatedOrder?.fulfillmentStatus}, Wh: ${updatedOrder?.warehouseId}`);

        if (updatedOrder?.fulfillmentStatus === 'PARTIAL' || updatedOrder?.fulfillmentStatus === 'ALLOCATED') {
            console.log('Allocation status check passed (PARTIAL/ALLOCATED).');
        } else {
            console.warn(`WARNING: Unexpected status ${updatedOrder?.fulfillmentStatus}`);
        }

        const transfer = await prisma.order.findFirst({
            where: {
                type: 'TRANSFER',
                parentOrderId: order.id
            }
        });

        if (transfer) {
            console.log(`SUCCESS: Transfer Order Created: ${transfer.id}`);
            console.log(`- Source: ${transfer.warehouseId}, Dest: ${transfer.destinationWarehouseId}`);
        } else {
            throw new Error('FAILED: No Transfer Order found linked to parent order.');
        }

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
