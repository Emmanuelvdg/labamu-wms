import { Injectable, HttpException } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RuleService } from '../rule/rule.service';
import { StockMoveService } from '../inventory/stock-move.service';
import { PutawayService } from '../inventory/putaway.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReceiptCompletedEvent } from '../inventory/events/inbound.events';

@Injectable()
export class PurchaseOrderService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private ruleService: RuleService,
        private stockMoveService: StockMoveService,
        private putawayService: PutawayService,
        private eventEmitter: EventEmitter2,
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

        let capturedWarehouseId: string;
        const result = await this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: { include: { packaging: true, receiptItems: true } } },
            });

            if (!po) throw new AppError('PO_NOT_FOUND', { purchaseOrderId });
            if (po.status === 'RECEIVED' || po.status === 'CANCELLED') throw new AppError('PO_ALREADY_CLOSED', { status: po.status });

            // Ensure PO is approved
            if (po.approvalStatus !== 'APPROVED') {
                throw new AppError('PO_NOT_APPROVED', { approvalStatus: po.approvalStatus || 'DRAFT' });
            }

            // Determine items to process
            let itemsToProcess: { poItem: any; quantity: number }[] = [];

            if (itemsToReceive && itemsToReceive.length > 0) {
                // Validate and map provided items
                for (const reqItem of itemsToReceive) {
                    const poItem = po.items.find(i => i.id === reqItem.poItemId);
                    if (!poItem) throw new AppError('PO_ITEM_NOT_FOUND', { poItemId: reqItem.poItemId, purchaseOrderId });
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
                throw new AppError('NO_ITEMS_TO_RECEIVE');
            }

            // 1. Get Warehouse ID
            // Priority: explicit destinationLocationId > stock move's destination warehouse
            // This ensures that when a caller explicitly passes a receiving location, we use
            // that location's warehouse rather than the warehouse of an auto-created stock move
            // (which may point to a different warehouse's "Stock" location).
            let warehouseId: string;
            if (destinationLocationId) {
                const location = await tx.location.findUnique({ where: { id: destinationLocationId } });
                if (location?.warehouseId) {
                    warehouseId = location.warehouseId;
                } else {
                    throw new AppError('WAREHOUSE_NOT_DETERMINED');
                }
            } else {
                const existingMove = await tx.stockMove.findFirst({
                    where: { origin: purchaseOrderId },
                    include: { destinationLocation: true }
                });
                if (existingMove?.destinationLocation?.warehouseId) {
                    warehouseId = existingMove.destinationLocation.warehouseId;
                } else {
                    throw new AppError('WAREHOUSE_NOT_DETERMINED');
                }
            }
            capturedWarehouseId = warehouseId;

            // Get or create receiving location for this warehouse
            const receivingLocationId = await this.getReceivingLocation(warehouseId, tx);
            console.log(`[PurchaseOrderService] Using receiving location ${receivingLocationId} for warehouse ${warehouseId}`);

            // 2. Create Receipt at Receiving Location
            const receipt = await tx.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    destinationLocationId: receivingLocationId,
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

            // 3. Process Inventory (Batches)
            const adminUser = await tx.user.findFirst();
            if (!adminUser) throw new AppError('NO_USERS_IN_SYSTEM');

            const transferOrder = await this.stockMoveService.createInboundTransferHeader(tx, {
                purchaseOrderId: po.id,
                warehouseId: warehouseId,
                userId: adminUser.id,
                type: 'INBOUND_FLOW'
            });

            for (const item of itemsToProcess) {
                const poItem = item.poItem;
                const quantityToReceive = item.quantity;

                let unitQuantity = quantityToReceive;
                let isPackaged = false;
                let totalBaseUnits = quantityToReceive;

                if (poItem.packaging) {
                    totalBaseUnits = quantityToReceive * poItem.packaging.quantity;
                    unitQuantity = poItem.packaging.quantity;
                    isPackaged = true;
                }

                if (isPackaged) {
                    for (let i = 0; i < quantityToReceive; i++) {
                        const pkg = await tx.package.create({
                            data: {
                                name: `${poItem.packaging?.type.toUpperCase()}-${Date.now()}-${i}`,
                                type: poItem.packaging?.type || 'BOX',
                                locationId: receivingLocationId,
                                packagingId: poItem.packagingId
                            }
                        });

                        const batchNumber = `BATCH-${Date.now()}-${poItem.productId.substring(0, 4)}-${i}`;
                        await tx.inventoryBatch.create({
                            data: {
                                productId: poItem.productId,
                                warehouseId: warehouseId,
                                locationId: receivingLocationId,
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
                    const batchNumber = `BATCH-${Date.now()}-${poItem.productId.substring(0, 4)}`;
                    await tx.inventoryBatch.create({
                        data: {
                            productId: poItem.productId,
                            warehouseId: warehouseId,
                            locationId: receivingLocationId,
                            batchNumber: batchNumber,
                            initialQuantity: quantityToReceive,
                            currentQuantity: quantityToReceive,
                            costPerUnit: poItem.unitCost,
                            purchaseDate: new Date(),
                            status: 'Active',
                        },
                    });
                }

                await this.stockMoveService.generateInboundMoves(tx, transferOrder.id, {
                    productId: poItem.productId,
                    quantity: totalBaseUnits,
                    warehouseId: warehouseId
                });

                const existingInventory = await tx.productInventory.findFirst({
                    where: { productId: poItem.productId, warehouseId: warehouseId, locationId: receivingLocationId },
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
                            warehouseId: warehouseId,
                            locationId: receivingLocationId,
                            quantity: totalBaseUnits,
                        },
                    });
                }

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

            // 5. Update PO Status
            let allReceived = true;
            let anyReceived = false;

            for (const poItem of po.items) {
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

        // 6. Emit Receipt Completed Event (After transaction commits)
        const receiptWithItems = await this.prisma.receipt.findUnique({
            where: { id: result.id },
            include: { items: true }
        });

        if (receiptWithItems && capturedWarehouseId) {
            this.eventEmitter.emit(
                'receipt.completed',
                new ReceiptCompletedEvent(
                    receiptWithItems.id,
                    capturedWarehouseId,
                    purchaseOrderId,
                    receiptWithItems.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        locationId: receiptWithItems.destinationLocationId
                    }))
                )
            );
        }

        return result;
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

    private async getReceivingLocation(warehouseId: string, tx: any): Promise<string> {
        // Prefer functional-area-linked location (same logic as getReceivingLocationIds in putaway.service)
        // so that receiveGoods and createSession always agree on which location holds receipts.
        const functionalArea = await tx.warehouseFunctionalArea.findFirst({
            where: {
                warehouseId,
                areaType: { in: ['RECEIVING', 'STAGING'] },
                active: true,
                linkedLocationId: { not: null }
            },
            orderBy: { sequence: 'asc' }
        });

        if (functionalArea?.linkedLocationId) return functionalArea.linkedLocationId;

        // Fallback: name-based search — exclude Shipping Dock to avoid ambiguity with 'Dock'
        const receivingLoc = await tx.location.findFirst({
            where: {
                warehouseId,
                OR: [
                    { name: { contains: 'Receiving' } },
                    { name: { contains: 'Intake' } },
                    { name: { contains: 'Input' } }
                ],
                NOT: { name: { contains: 'Shipping' } },
                type: 'INTERNAL'
            }
        });

        if (receivingLoc) return receivingLoc.id;

        const warehousePrimaryLoc = await tx.location.findFirst({
            where: { warehouseId, parentId: null }
        });

        if (!warehousePrimaryLoc) {
            throw new AppError('PRIMARY_LOCATION_NOT_FOUND', { warehouseId });
        }

        const newReceivingLoc = await tx.location.create({
            data: {
                name: 'Receiving Dock',
                type: 'INTERNAL',
                warehouseId,
                parentId: warehousePrimaryLoc.id
            }
        });

        return newReceivingLoc.id;
    }

    async attachDocument(purchaseOrderId: string, data: {
        documentType: string;
        fileName: string;
        filePath: string;
        mimeType?: string;
        fileSize?: number;
        uploadedBy?: string;
    }) {
        return this.prisma.documentAttachment.create({
            data: {
                purchaseOrderId,
                documentType: data.documentType,
                fileName: data.fileName,
                filePath: data.filePath,
                mimeType: data.mimeType,
                fileSize: data.fileSize,
                uploadedBy: data.uploadedBy,
            },
        });
    }

    async getDocuments(purchaseOrderId: string) {
        return this.prisma.documentAttachment.findMany({
            where: { purchaseOrderId },
            orderBy: { uploadedAt: 'desc' },
        });
    }

    async downloadDocument(purchaseOrderId: string, docId: string, res: any) {
        console.log(`[DOWNLOAD] PO: '${purchaseOrderId}', DOC: '${docId}'`);
        const doc = await this.prisma.documentAttachment.findFirst({
            where: { id: docId, purchaseOrderId },
        });

        if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', { docId, purchaseOrderId });

        const { join } = require('path');
        const fs = require('fs');
        const { StreamableFile } = require('@nestjs/common');

        const uploadDir = join(process.cwd(), 'uploads', 'po-documents');
        const file = join(uploadDir, doc.filePath);

        if (!fs.existsSync(file)) {
            throw new AppError('FILE_NOT_FOUND', { filePath: doc.filePath });
        }

        res.set({
            'Content-Type': doc.mimeType || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${doc.fileName}"`,
        });

        const fileStream = fs.createReadStream(file);
        return new StreamableFile(fileStream);
    }

    async submitInspection(purchaseOrderId: string, data: {
        inspectorId?: string;
        notes?: string;
        results: { productId: string; receivedQty: number; acceptedQty: number; rejectedQty: number; rejectionReason?: string }[];
    }) {
        return this.prisma.$transaction(async (tx) => {
            const totalRejected = data.results.reduce((sum, r) => sum + r.rejectedQty, 0);
            const totalAccepted = data.results.reduce((sum, r) => sum + r.acceptedQty, 0);
            let status = 'PASSED';
            if (totalAccepted === 0 && totalRejected > 0) status = 'FAILED';
            else if (totalRejected > 0) status = 'PARTIAL';

            const inspection = await tx.qaInspection.create({
                data: {
                    purchaseOrderId,
                    status,
                    inspectorId: data.inspectorId,
                    notes: data.notes,
                    results: {
                        create: data.results.map(r => ({
                            productId: r.productId,
                            receivedQty: r.receivedQty,
                            acceptedQty: r.acceptedQty,
                            rejectedQty: r.rejectedQty,
                            rejectionReason: r.rejectionReason,
                        })),
                    },
                },
                include: { results: true },
            });

            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { receipts: { include: { items: true } } },
            });

            if (po && po.receipts.length > 0) {
                const lastReceipt = po.receipts[po.receipts.length - 1];

                for (const result of data.results) {
                    if (result.rejectedQty > 0) {
                        const existingInventory = await tx.productInventory.findFirst({
                            where: {
                                productId: result.productId,
                                locationId: lastReceipt.destinationLocationId,
                            },
                        });

                        if (existingInventory && existingInventory.quantity >= result.rejectedQty) {
                            await tx.productInventory.update({
                                where: { id: existingInventory.id },
                                data: { quantity: { decrement: result.rejectedQty } },
                            });
                        }

                        await tx.inventoryAdjustment.create({
                            data: {
                                locationId: lastReceipt.destinationLocationId,
                                productId: result.productId,
                                countedQuantity: result.acceptedQty,
                                currentQuantity: result.receivedQty,
                                quantity: -result.rejectedQty,
                                reason: `QA Rejection: ${result.rejectionReason || 'Unspecified'}`,
                                status: 'APPLIED',
                            },
                        });

                        await tx.stockTransaction.create({
                            data: {
                                productId: result.productId,
                                type: 'ADJUSTMENT',
                                quantity: -result.rejectedQty,
                                referenceId: inspection.id,
                                date: new Date(),
                            },
                        });
                    }
                }
            }

            return inspection;
        });
    }

    async scanReceive(purchaseOrderId: string, barcode: string, locationId?: string) {
        const product = await this.prisma.product.findFirst({
            where: { OR: [{ sku: barcode }, { id: barcode }] }
        });
        if (!product) throw new HttpException('Product not found for barcode: ' + barcode, 404);

        const poItem = await this.prisma.purchaseOrderItem.findFirst({
            where: { purchaseOrderId, productId: product.id }
        });
        if (!poItem) throw new HttpException('Product not in this PO: ' + product.name, 400);

        let targetLocationId = locationId;
        if (!targetLocationId) {
            const defaultLocation = await this.prisma.location.findFirst({
                where: { OR: [{ type: 'RECEIVING' }, { type: 'DOCK' }] }
            });
            if (defaultLocation) {
                targetLocationId = defaultLocation.id;
            } else {
                throw new HttpException('No location specified and no default receiving location found', 400);
            }
        }

        return this.receiveGoods(purchaseOrderId, targetLocationId, [{
            poItemId: poItem.id,
            quantity: 1
        }]);
    }

    async getInspections(purchaseOrderId: string) {
        return this.prisma.qaInspection.findMany({
            where: { purchaseOrderId },
            include: { results: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async verifyThreeWayMatch(purchaseOrderId: string) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: {
                items: { include: { product: true } },
                receipts: { include: { items: true } },
                invoices: { include: { items: true } },
                inspections: { include: { results: true } },
            },
        });

        if (!po) throw new AppError('PO_NOT_FOUND', { purchaseOrderId });

        const matchResults: any[] = [];
        let overallMatch = true;

        for (const poItem of po.items) {
            const orderedQty = poItem.quantity;
            const receivedQty = po.receipts.reduce((sum, r) =>
                sum + r.items.filter(ri => ri.productId === poItem.productId)
                    .reduce((s, ri) => s + ri.quantity, 0), 0);

            const acceptedQty = po.inspections.reduce((sum, insp) =>
                sum + insp.results.filter(r => r.productId === poItem.productId)
                    .reduce((s, r) => s + r.acceptedQty, 0), 0);

            const invoicedQty = po.invoices.reduce((sum, inv) =>
                sum + inv.items.filter(ii => ii.productId === poItem.productId)
                    .reduce((s, ii) => s + ii.quantity, 0), 0);

            const invoiceTotal = po.invoices.reduce((sum, inv) =>
                sum + inv.items.filter(ii => ii.productId === poItem.productId)
                    .reduce((s, ii) => s + ii.totalPrice, 0), 0);

            const expectedCost = orderedQty * poItem.unitCost;

            const qtyMatch = orderedQty === receivedQty && (invoicedQty === 0 || invoicedQty === orderedQty);
            const costMatch = invoiceTotal === 0 || Math.abs(invoiceTotal - expectedCost) < 0.01;

            if (!qtyMatch || !costMatch) overallMatch = false;

            matchResults.push({
                productId: poItem.productId,
                productName: poItem.product.name,
                orderedQty,
                receivedQty,
                acceptedQty: po.inspections.length > 0 ? acceptedQty : receivedQty,
                invoicedQty,
                expectedCost,
                invoiceTotal,
                qtyMatch,
                costMatch,
            });
        }

        const matchStatus = overallMatch ? 'MATCHED' : 'DISCREPANCY';

        await this.prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { threeWayMatch: matchStatus },
        });

        return {
            purchaseOrderId,
            matchStatus,
            items: matchResults,
        };
    }
}
