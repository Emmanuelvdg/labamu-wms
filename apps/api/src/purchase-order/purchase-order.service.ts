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

    async createPurchaseOrder(data: { supplierId: string; expectedDate?: Date; items: { productId: string; quantity: number; unitCost: number; packagingId?: string }[]; destinationLocationId?: string }) {
        return this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.create({
                data: {
                    supplierId: data.supplierId,
                    status: 'ORDERED',
                    expectedDate: data.expectedDate,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            packagingId: item.packagingId,
                        })),
                    },
                },
                include: { items: true, supplier: true },
            });

            // Auto-create Stock Move (Vendor -> Destination)
            // Default destination to first warehouse input if not provided (simplified)
            let destLocationId = data.destinationLocationId;
            if (!destLocationId) {
                // Try to find a default location (e.g. first warehouse stock/input)
                const warehouse = await tx.warehouse.findFirst();
                if (warehouse) {
                    // Ideally check incomingSteps but for now default to View -> Stock or similar
                    // Let's try to find a location named 'Input' or 'Stock' in this warehouse
                    const loc = await tx.location.findFirst({
                        where: { warehouseId: warehouse.id, name: { in: ['Input', 'Stock'] } }
                    });
                    destLocationId = loc?.id;
                }
            }

            if (destLocationId) {
                for (const item of po.items) {
                    await this.inventoryService.createStockMove({
                        productId: item.productId,
                        quantity: item.quantity,
                        sourceLocationId: undefined, // Vendor
                        destinationLocationId: destLocationId,
                        origin: po.id,
                        status: 'WAITING', // Waiting for receipt
                    }, tx);
                }
            }

            return po;
        });
    }

    async getPurchaseOrders() {
        return this.prisma.purchaseOrder.findMany({
            include: { items: true, supplier: true, receipts: true },
        });
    }

    async getPurchaseOrder(id: string) {
        console.log(`[PurchaseOrderService] Getting PO: ${id}`);
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: { include: { product: true, packaging: true } }, supplier: true, receipts: true },
        });
        console.log(`[PurchaseOrderService] Found PO: ${po ? 'yes' : 'no'}`);
        return po;
    }

    async getSuppliers() {
        return this.prisma.supplier.findMany();
    }

    async receiveGoods(purchaseOrderId: string, destinationLocationId: string) {
        console.log(`[PurchaseOrderService] Receiving goods for PO: ${purchaseOrderId} to ${destinationLocationId}`);
        // 1. Perform Receipt (Transaction)
        const result = await this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: { include: { packaging: true } } },
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
                // Determine quantity and packaging
                let quantityToReceive = item.quantity;
                let unitQuantity = item.quantity; // Base units per batch
                let isPackaged = false;

                if (item.packaging) {
                    // If packaged, item.quantity is number of PACKAGES.
                    // We need to create item.quantity PACKAGES, each containing item.packaging.quantity UNITS.
                    quantityToReceive = item.quantity * item.packaging.quantity;
                    unitQuantity = item.packaging.quantity;
                    isPackaged = true;
                }

                if (isPackaged) {
                    // Create multiple packages (LPNs)
                    for (let i = 0; i < item.quantity; i++) {
                        // Create Package LPN
                        const pkg = await tx.package.create({
                            data: {
                                name: `${item.packaging?.type.toUpperCase()}-${Date.now()}-${i}`,
                                type: item.packaging?.type || 'BOX',
                                locationId: destinationLocationId,
                                packagingId: item.packagingId
                            }
                        });

                        // Create Batch inside Package
                        const batchNumber = `BATCH-${Date.now()}-${item.productId.substring(0, 4)}-${i}`;
                        await tx.inventoryBatch.create({
                            data: {
                                productId: item.productId,
                                warehouseId: location.warehouseId,
                                locationId: destinationLocationId,
                                packageId: pkg.id,
                                batchNumber: batchNumber,
                                initialQuantity: unitQuantity,
                                currentQuantity: unitQuantity,
                                costPerUnit: item.unitCost,
                                purchaseDate: new Date(),
                                status: 'Active',
                            },
                        });
                    }
                } else {
                    // Standard Item Receipt
                    const batchNumber = `BATCH-${Date.now()}-${item.productId.substring(0, 4)}`;
                    await tx.inventoryBatch.create({
                        data: {
                            productId: item.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            batchNumber: batchNumber,
                            initialQuantity: quantityToReceive,
                            currentQuantity: quantityToReceive,
                            costPerUnit: item.unitCost,
                            purchaseDate: new Date(),
                            status: 'Active',
                        },
                    });
                }

                // Update Aggregate Inventory (Always in base units)
                const existingInventory = await tx.productInventory.findFirst({
                    where: { productId: item.productId, warehouseId: location.warehouseId, locationId: destinationLocationId },
                });

                if (existingInventory) {
                    await tx.productInventory.update({
                        where: { id: existingInventory.id },
                        data: { quantity: { increment: quantityToReceive } },
                    });
                } else {
                    await tx.productInventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            quantity: quantityToReceive,
                        },
                    });
                }

                // Log Transaction
                await tx.stockTransaction.create({
                    data: {
                        productId: item.productId,
                        type: 'IN',
                        quantity: quantityToReceive,
                        referenceId: receipt.id,
                        date: new Date(),
                    },
                });
            }

            // 3. Update PO Status
            console.log(`[PurchaseOrderService] Updating PO ${po.id} status to RECEIVED`);
            const updatedPo = await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: 'RECEIVED' },
            });
            console.log(`[PurchaseOrderService] PO updated. New status: ${updatedPo.status}`);

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
