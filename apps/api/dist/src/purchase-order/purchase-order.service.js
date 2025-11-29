"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
const rule_service_1 = require("../rule/rule.service");
let PurchaseOrderService = class PurchaseOrderService {
    constructor(prisma, inventoryService, ruleService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
        this.ruleService = ruleService;
    }
    async createPurchaseOrder(data) {
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
    async receiveGoods(purchaseOrderId, destinationLocationId) {
        const result = await this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: true },
            });
            if (!po)
                throw new Error('Purchase Order not found');
            if (po.status === 'RECEIVED')
                throw new Error('Purchase Order already received');
            const receipt = await tx.receipt.create({
                data: {
                    purchaseOrderId: po.id,
                    destinationLocationId: destinationLocationId,
                    status: 'DONE',
                },
            });
            const location = await tx.location.findUnique({ where: { id: destinationLocationId } });
            if (!location || !location.warehouseId)
                throw new Error('Destination location must belong to a warehouse');
            for (const item of po.items) {
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
                const existingInventory = await tx.productInventory.findFirst({
                    where: { productId: item.productId, warehouseId: location.warehouseId, locationId: destinationLocationId },
                });
                if (existingInventory) {
                    await tx.productInventory.update({
                        where: { id: existingInventory.id },
                        data: { quantity: { increment: item.quantity } },
                    });
                }
                else {
                    await tx.productInventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: location.warehouseId,
                            locationId: destinationLocationId,
                            quantity: item.quantity,
                        },
                    });
                }
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
            await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: 'RECEIVED' },
            });
            return { receipt, items: po.items };
        });
        for (const item of result.items) {
            await this.ruleService.applyPushRules(item.productId, destinationLocationId, item.quantity);
        }
        return result.receipt;
    }
};
exports.PurchaseOrderService = PurchaseOrderService;
exports.PurchaseOrderService = PurchaseOrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService,
        rule_service_1.RuleService])
], PurchaseOrderService);
//# sourceMappingURL=purchase-order.service.js.map