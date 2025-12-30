import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RuleService } from '../rule/rule.service';
import { StockMoveService } from '../inventory/stock-move.service';

@Injectable()
export class PurchaseOrderService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private ruleService: RuleService,
        private stockMoveService: StockMoveService,
    ) { }

    async createPurchaseOrder(data: {
        supplierId: string;
        expectedDate?: Date;
        items: { productId: string; quantity: number; unitCost: number; packagingId?: string }[];
        destinationLocationId?: string;
        // New Fields
        poNumber?: string;
        orderDate?: Date;
        buyerName?: string;
        buyerAddress?: string;
        buyerContact?: string;
        shipToAddress?: string;
        billToAddress?: string;
        paymentTerms?: string;
        deliveryTerms?: string;
        notes?: string;
        taxAmount?: number;
        shippingCost?: number;
    }) {
        return this.prisma.$transaction(async (tx) => {
            // Auto-generate PO Number if not provided
            let poNumber = data.poNumber;
            if (!poNumber) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const count = await tx.purchaseOrder.count();
                poNumber = `PO-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
            }

            // Calculate Totals
            const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
            const taxAmount = data.taxAmount || 0;
            const shippingCost = data.shippingCost || 0;
            const totalAmount = subtotal + taxAmount + shippingCost;

            const po = await tx.purchaseOrder.create({
                data: {
                    supplierId: data.supplierId,
                    status: 'ORDERED',
                    expectedDate: data.expectedDate,
                    poNumber,
                    orderDate: data.orderDate || new Date(),
                    buyerName: data.buyerName,
                    buyerAddress: data.buyerAddress,
                    buyerContact: data.buyerContact,
                    shipToAddress: data.shipToAddress,
                    billToAddress: data.billToAddress,
                    paymentTerms: data.paymentTerms,
                    deliveryTerms: data.deliveryTerms,
                    notes: data.notes,
                    taxAmount,
                    shippingCost,
                    totalAmount,
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

    async getReceipts(purchaseOrderId: string) {
        return this.prisma.receipt.findMany({
            where: { purchaseOrderId },
            include: { items: { include: { product: true } } },
            orderBy: { receivedAt: 'desc' }
        });
    }

    async receiveGoods(purchaseOrderId: string, destinationLocationId: string, itemsToReceive?: { poItemId: string; quantity: number }[]) {
        console.log(`[PurchaseOrderService] Receiving goods for PO: ${purchaseOrderId} to ${destinationLocationId}`);

        return this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: { include: { packaging: true, receiptItems: true } } },
            });

            if (!po) throw new Error('Purchase Order not found');
            if (po.status === 'RECEIVED' || po.status === 'CANCELLED') throw new Error(`Purchase Order is ${po.status}`);

            // Determine items to process
            let itemsToProcess: { poItem: any; quantity: number }[] = [];

            if (itemsToReceive && itemsToReceive.length > 0) {
                // Validate and map provided items
                for (const reqItem of itemsToReceive) {
                    const poItem = po.items.find(i => i.id === reqItem.poItemId);
                    if (!poItem) throw new Error(`PO Item ${reqItem.poItemId} not found in PO ${purchaseOrderId}`);
                    itemsToProcess.push({ poItem, quantity: reqItem.quantity });
                }
            } else {
                // Receive ALL remaining quantity
                for (const poItem of po.items) {
                    const receivedSoFar = poItem.receiptItems.reduce((sum, ri) => sum + ri.quantity, 0);
                    const remaining = poItem.quantity - receivedSoFar;
                    if (remaining > 0) {
                        itemsToProcess.push({ poItem, quantity: remaining });
                    }
                }
            }

            if (itemsToProcess.length === 0) {
                throw new Error('No items to receive');
            }

            // 1. Create Receipt
            const receipt = await tx.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    destinationLocationId: destinationLocationId,
                    status: 'DONE',
                    items: {
                        create: itemsToProcess.map(item => ({
                            productId: item.poItem.productId,
                            quantity: item.quantity,
                            poItemId: item.poItem.id,
                        }))
                    }
                },
                include: { items: true }
            });

            // 2. Process Inventory (Batches)
            const location = await tx.location.findUnique({ where: { id: destinationLocationId } });
            if (!location || !location.warehouseId) throw new Error('Destination location must belong to a warehouse');

            // NEW: Create Linked Transfer Order
            const transferOrder = await this.stockMoveService.createInboundTransferHeader(tx, {
                purchaseOrderId: po.id,
                warehouseId: location.warehouseId,
                userId: 'SYSTEM',
                type: 'INBOUND_FLOW'
            });

            for (const item of itemsToProcess) {
                const poItem = item.poItem;
                const quantityToReceive = item.quantity;

                // Handle Packaging (if applicable)
                let unitQuantity = quantityToReceive;
                let isPackaged = false;
                let totalBaseUnits = quantityToReceive;

                if (poItem.packaging) {
                    // PO Item quantity is in Packages
                    totalBaseUnits = quantityToReceive * poItem.packaging.quantity;
                    unitQuantity = poItem.packaging.quantity;
                    isPackaged = true;
                }

                if (isPackaged) {
                    for (let i = 0; i < quantityToReceive; i++) {
                        // Create Package LPN
                        const pkg = await tx.package.create({
                            data: {
                                name: `${poItem.packaging?.type.toUpperCase()}-${Date.now()}-${i}`,
                                type: poItem.packaging?.type || 'BOX',
                                locationId: destinationLocationId,
                                packagingId: poItem.packagingId
                            }
                        });

                        // Create Batch
                        const batchNumber = `BATCH-${Date.now()}-${poItem.productId.substring(0, 4)}-${i}`;
                        await tx.inventoryBatch.create({
                            data: {
                                productId: poItem.productId,
                                warehouseId: location.warehouseId,
                                locationId: destinationLocationId,
                                packageId: pkg.id,
                                batchNumber: batchNumber,
                                initialQuantity: unitQuantity,
                                currentQuantity: unitQuantity,
                                costPerUnit: poItem.unitCost,
                                purchaseDate: new Date(),
                                status: 'Active',
                            },
                        });
                    }
                } else {
                    // Standard Item
                    const batchNumber = `BATCH-${Date.now()}-${poItem.productId.substring(0, 4)}`;
                    await tx.inventoryBatch.create({
                        data: {
                            productId: poItem.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            batchNumber: batchNumber,
                            initialQuantity: quantityToReceive,
                            currentQuantity: quantityToReceive,
                            costPerUnit: poItem.unitCost,
                            purchaseDate: new Date(),
                            status: 'Active',
                        },
                    });
                }

                // NEW: Trace Process (For this Item)
                await this.stockMoveService.generateInboundMoves(tx, transferOrder.id, {
                    productId: poItem.productId,
                    quantity: totalBaseUnits,
                    warehouseId: location.warehouseId
                });

                // Update Aggregate Inventory
                const existingInventory = await tx.productInventory.findFirst({
                    where: { productId: poItem.productId, warehouseId: location.warehouseId, locationId: destinationLocationId },
                });

                if (existingInventory) {
                    await tx.productInventory.update({
                        where: { id: existingInventory.id },
                        data: { quantity: { increment: totalBaseUnits } },
                    });
                } else {
                    await tx.productInventory.create({
                        data: {
                            productId: poItem.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            quantity: totalBaseUnits,
                        },
                    });
                }

                // Log Transaction
                await tx.stockTransaction.create({
                    data: {
                        productId: poItem.productId,
                        type: 'IN',
                        quantity: totalBaseUnits,
                        referenceId: receipt.id,
                        date: new Date(),
                    },
                });
            }

            // 3. Update PO Status
            // Check if fully received
            let allReceived = true;
            let anyReceived = false;

            for (const poItem of po.items) {
                // Include the just-received items
                const justReceived = itemsToProcess.find(i => i.poItem.id === poItem.id)?.quantity || 0;
                const previouslyReceived = poItem.receiptItems.reduce((sum, ri) => sum + ri.quantity, 0);
                const totalReceived = previouslyReceived + justReceived;

                if (totalReceived > 0) anyReceived = true;
                if (totalReceived < poItem.quantity) allReceived = false;
            }

            const newStatus = allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : 'ORDERED');

            if (po.status !== newStatus) {
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: { status: newStatus },
                });
            }

            return receipt;
        });
    }
    async submitForApproval(id: string) {
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { approvalStatus: 'PENDING_APPROVAL' },
        });
    }

    async approvePurchaseOrder(id: string, userId: string) {
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                approvalStatus: 'APPROVED',
                status: 'ORDERED', // Auto-issue for now
                approvedBy: userId,
                approvedAt: new Date(),
            },
        });
    }

    async rejectPurchaseOrder(id: string, userId: string, reason: string) {
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                approvalStatus: 'REJECTED',
                rejectionReason: reason,
            },
        });
    }
}
