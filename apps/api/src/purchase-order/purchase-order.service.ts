import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RuleService } from '../rule/rule.service';

@Injectable()
export class PurchaseOrderService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private ruleService: RuleService,
    ) { }

    async createPurchaseOrder(data: { supplierId: string; expectedDate?: Date; items: { productId: string; quantity: number; unitCost: number }[] }) {
        return this.prisma.purchaseOrder.create({
            data: {
                supplierId: data.supplierId,
                status: 'ORDERED',
                expectedDate: data.expectedDate,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                    })),
                },
            },
            include: { items: true, supplier: true },
        });
    }

    async getPurchaseOrders() {
        return this.prisma.purchaseOrder.findMany({
            include: { items: true, supplier: true, receipts: true },
        });
    }

    async receiveGoods(purchaseOrderId: string, destinationLocationId: string) {
        // 1. Perform Receipt (Transaction)
        const result = await this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: true },
            });

            if (!po) throw new Error('Purchase Order not found');
            if (po.status === 'RECEIVED') throw new Error('Purchase Order already received');

            // 1. Create Receipt
            const receipt = await tx.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    destinationLocationId: destinationLocationId,
                    status: 'DONE',
                },
            });

            // 2. Process Items (Create Inventory Batches)
            // We need to fetch the warehouse ID from the location
            const location = await tx.location.findUnique({ where: { id: destinationLocationId } });
            if (!location || !location.warehouseId) throw new Error('Destination location must belong to a warehouse');

            for (const item of po.items) {
                // Create Inventory Batch
                // Create Inventory Batch (Directly via Prisma to avoid service limitations)

                // Wait, InventoryService.createBatch doesn't exist in the previous context. 
                // I should check InventoryService again or implement the logic here.
                // Let's implement logic here for now to avoid modifying InventoryService too much.

                const batchNumber = `BATCH-${Date.now()}-${item.productId.substring(0, 4)}`;

                await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        warehouseId: location.warehouseId,
                        locationId: destinationLocationId,
                        batchNumber: batchNumber,
                        initialQuantity: item.quantity,
                        currentQuantity: item.quantity,
                        costPerUnit: item.unitCost,
                        purchaseDate: new Date(),
                        status: 'Active',
                    },
                });

                // Update Aggregate Inventory
                const existingInventory = await tx.productInventory.findFirst({
                    where: { productId: item.productId, warehouseId: location.warehouseId, locationId: destinationLocationId },
                });

                if (existingInventory) {
                    await tx.productInventory.update({
                        where: { id: existingInventory.id },
                        data: { quantity: { increment: item.quantity } },
                    });
                } else {
                    await tx.productInventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            quantity: item.quantity,
                        },
                    });
                }

                // Log Transaction
                await tx.stockTransaction.create({
                    data: {
                        productId: item.productId,
                        type: 'IN',
                        quantity: item.quantity,
                        referenceId: receipt.id,
                        date: new Date(),
                    },
                });
            }

            // 3. Update PO Status
            await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: 'RECEIVED' },
            });

            return { receipt, items: po.items };
        });

        // 2. Trigger Rules (Outside Transaction to avoid locking/complexity if rules fail or are async)
        // Note: If rule fails, receipt is still committed. This is usually acceptable as stock is physically there.
        for (const item of result.items) {
            await this.ruleService.applyPushRules(item.productId, destinationLocationId, item.quantity);
        }

        return result.receipt;
    }
}
