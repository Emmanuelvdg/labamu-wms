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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createProduct(data) {
        return this.prisma.product.create({
            data: {
                sku: data.sku,
                name: data.name,
                category: data.category,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                classification: data.classification,
                type: data.type,
                unitOfMeasure: data.unitOfMeasure,
                averageCost: data.averageCost,
                status: data.status,
                tracking: data.tracking || 'none',
            },
        });
    }
    async getProducts() {
        return this.prisma.product.findMany();
    }
    async createWarehouse(data) {
        return this.prisma.warehouse.create({
            data: Object.assign(Object.assign({}, data), { location: JSON.stringify(data.location) }),
        });
    }
    async getWarehouses() {
        const warehouses = await this.prisma.warehouse.findMany();
        return warehouses.map(w => {
            try {
                return Object.assign(Object.assign({}, w), { location: JSON.parse(w.location) });
            }
            catch (e) {
                return Object.assign(Object.assign({}, w), { location: w.location });
            }
        });
    }
    async addStock(data) {
        const inventory = await this.prisma.productInventory.findFirst({
            where: { productId: data.productId, warehouseId: data.warehouseId },
        });
        if (inventory) {
            return this.prisma.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: inventory.quantity + data.quantity },
            });
        }
        else {
            return this.prisma.productInventory.create({
                data: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    quantity: data.quantity,
                    locationId: data.locationId,
                },
            });
        }
    }
    async getStock(productId) {
        return this.prisma.productInventory.findMany({
            where: { productId },
            include: { warehouse: true },
        });
    }
    async addBatch(data) {
        const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
        if (!product)
            throw new Error('Product not found');
        if (product.tracking === 'serial') {
            if (data.quantity !== 1) {
                throw new Error('Serial tracked products must be added one by one (quantity 1)');
            }
            if (!data.batchNumber) {
                throw new Error('Serial number is required for serial tracked products');
            }
        }
        const batch = await this.prisma.inventoryBatch.create({
            data: {
                batchNumber: data.batchNumber || `BATCH-${Date.now()}`,
                productId: data.productId,
                warehouseId: data.warehouseId,
                locationId: data.locationId,
                initialQuantity: data.quantity,
                currentQuantity: data.quantity,
                costPerUnit: data.costPerUnit,
                purchaseDate: data.purchaseDate,
                expiryDate: data.expiryDate,
                status: 'Active',
                vendor: data.vendor,
            },
        });
        const existingInventory = await this.prisma.productInventory.findFirst({
            where: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                locationId: data.locationId,
            },
        });
        if (existingInventory) {
            await this.prisma.productInventory.update({
                where: { id: existingInventory.id },
                data: { quantity: { increment: data.quantity } },
            });
        }
        else {
            await this.prisma.productInventory.create({
                data: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    locationId: data.locationId,
                    quantity: data.quantity,
                },
            });
        }
        await this.prisma.stockTransaction.create({
            data: {
                productId: data.productId,
                batchId: batch.id,
                type: 'IN',
                quantity: data.quantity,
                date: new Date(),
            },
        });
        return batch;
    }
    async getBatches(productId) {
        return this.prisma.inventoryBatch.findMany({
            where: { productId },
            include: { warehouse: true, location: true },
        });
    }
    async getTransactions(productId) {
        return this.prisma.stockTransaction.findMany({
            where: { productId },
            orderBy: { date: 'desc' },
        });
    }
    async reserveStock(data) {
        const results = [];
        await this.prisma.$transaction(async (tx) => {
            for (const item of data.items) {
                const inventory = await tx.productInventory.findMany({
                    where: { productId: item.productId },
                    include: { product: true, warehouse: true },
                    orderBy: data.strategy === 'FEFO'
                        ? { product: { expiryDate: 'asc' } }
                        : { warehouse: { id: 'asc' } }
                });
                let remainingQty = item.quantity;
                for (const stock of inventory) {
                    if (remainingQty <= 0)
                        break;
                    const available = stock.quantity - stock.reserved;
                    if (available > 0) {
                        const take = Math.min(available, remainingQty);
                        await tx.productInventory.update({
                            where: { id: stock.id },
                            data: { reserved: { increment: take } }
                        });
                        await tx.reservation.create({
                            data: {
                                orderId: data.orderId,
                                productId: item.productId,
                                quantity: take,
                                reservationStrategy: data.strategy,
                            }
                        });
                        remainingQty -= take;
                    }
                }
                if (remainingQty > 0) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }
            }
        });
        return results;
    }
    async getLocationsTree(warehouseId) {
        if (warehouseId) {
            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: warehouseId },
                include: { viewLocation: { include: { children: { include: { children: true } } } } },
            });
            return (warehouse === null || warehouse === void 0 ? void 0 : warehouse.viewLocation) ? [warehouse.viewLocation] : [];
        }
        return this.prisma.location.findMany({
            where: { parentId: null },
            include: { children: { include: { children: true } } },
        });
    }
    async createLocation(data) {
        return this.prisma.location.create({
            data: {
                name: data.name,
                warehouseId: data.warehouseId,
                parentId: data.parentId,
                type: data.type || 'INTERNAL',
                removalStrategy: data.removalStrategy,
            },
        });
    }
    async createAdjustment(data) {
        return this.prisma.$transaction(async (tx) => {
            const quantity = data.countedQuantity - data.currentQuantity;
            const status = data.status || 'DRAFT';
            const adjustment = await tx.inventoryAdjustment.create({
                data: {
                    locationId: data.locationId,
                    productId: data.productId,
                    batchId: data.batchId,
                    countedQuantity: data.countedQuantity,
                    currentQuantity: data.currentQuantity,
                    quantity: quantity,
                    reason: data.reason,
                    status: status,
                },
            });
            if (status === 'APPLIED') {
                await this._applyAdjustmentLogic(tx, adjustment);
            }
            return adjustment;
        });
    }
    async updateAdjustment(id, data) {
        return this.prisma.inventoryAdjustment.update({
            where: { id },
            data: {
                countedQuantity: data.countedQuantity,
                locationId: data.locationId,
                status: data.status,
            },
        });
    }
    async applyAdjustment(id) {
        return this.prisma.$transaction(async (tx) => {
            const adjustment = await tx.inventoryAdjustment.findUnique({ where: { id } });
            if (!adjustment)
                throw new Error('Adjustment not found');
            if (adjustment.status === 'APPLIED')
                throw new Error('Adjustment already applied');
            await tx.inventoryAdjustment.update({
                where: { id },
                data: { status: 'APPLIED' },
            });
            await this._applyAdjustmentLogic(tx, adjustment);
            return adjustment;
        });
    }
    async _applyAdjustmentLogic(tx, adjustment) {
        await this.validateLocationForStock(adjustment.locationId);
        const inventory = await tx.productInventory.findFirst({
            where: {
                productId: adjustment.productId,
                locationId: adjustment.locationId,
            },
        });
        if (inventory) {
            await tx.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: { increment: adjustment.quantity } },
            });
        }
        else {
            const location = await tx.location.findUnique({ where: { id: adjustment.locationId } });
            if (location && location.warehouseId) {
                await tx.productInventory.create({
                    data: {
                        productId: adjustment.productId,
                        locationId: adjustment.locationId,
                        warehouseId: location.warehouseId,
                        quantity: adjustment.quantity,
                    },
                });
            }
        }
        if (adjustment.batchId) {
            await tx.inventoryBatch.update({
                where: { id: adjustment.batchId },
                data: { currentQuantity: { increment: adjustment.quantity } },
            });
        }
        await tx.stockTransaction.create({
            data: {
                productId: adjustment.productId,
                batchId: adjustment.batchId,
                type: 'ADJUSTMENT',
                quantity: adjustment.quantity,
                date: new Date(),
                referenceId: adjustment.id,
            },
        });
        const location = await tx.location.findUnique({ where: { id: adjustment.locationId } });
        if (location && location.inventoryFrequency > 0) {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + location.inventoryFrequency);
            await tx.location.update({
                where: { id: location.id },
                data: { nextInventoryDate: nextDate },
            });
        }
    }
    async getAdjustments(status) {
        const where = status ? { status } : {};
        return this.prisma.inventoryAdjustment.findMany({
            where,
            include: { product: true, location: true, batch: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createScrapOrder(data) {
        return this.prisma.$transaction(async (tx) => {
            const scrapOrder = await tx.scrapOrder.create({
                data: {
                    locationId: data.locationId,
                    productId: data.productId,
                    quantity: data.quantity,
                    reason: data.reason,
                    status: 'DONE',
                },
            });
            const inventory = await tx.productInventory.findFirst({
                where: {
                    productId: data.productId,
                    locationId: data.locationId,
                },
            });
            if (!inventory || inventory.quantity < data.quantity) {
                throw new Error('Insufficient stock to scrap');
            }
            await tx.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: { decrement: data.quantity } },
            });
            await tx.stockTransaction.create({
                data: {
                    productId: data.productId,
                    type: 'OUT',
                    quantity: data.quantity,
                    date: new Date(),
                    referenceId: scrapOrder.id,
                },
            });
            return scrapOrder;
        });
    }
    async getScrapOrders() {
        return this.prisma.scrapOrder.findMany({
            include: { product: true, location: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async moveLocation(locationId, newParentId) {
        if (newParentId) {
            let parent = await this.prisma.location.findUnique({ where: { id: newParentId } });
            while (parent) {
                if (parent.id === locationId) {
                    throw new Error('Cannot move a location inside itself');
                }
                if (!parent.parentId)
                    break;
                parent = await this.prisma.location.findUnique({ where: { id: parent.parentId } });
            }
        }
        return this.prisma.location.update({
            where: { id: locationId },
            data: { parentId: newParentId },
        });
    }
    async createPutawayRule(data) {
        return this.prisma.putawayRule.create({
            data: {
                productId: data.productId,
                categoryId: data.categoryId,
                locationId: data.locationId,
                priority: data.priority,
            },
        });
    }
    async getPutawayRules() {
        return this.prisma.putawayRule.findMany({
            include: { product: true, location: true },
            orderBy: { priority: 'desc' },
        });
    }
    async applyPutawayStrategy(productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            return null;
        const productRule = await this.prisma.putawayRule.findFirst({
            where: { productId: productId, active: true },
            orderBy: { priority: 'desc' },
        });
        if (productRule)
            return productRule.locationId;
        if (product.category) {
            const categoryRule = await this.prisma.putawayRule.findFirst({
                where: { categoryId: product.category, active: true },
                orderBy: { priority: 'desc' },
            });
            if (categoryRule)
                return categoryRule.locationId;
        }
        return null;
    }
    async suggestRemoval(locationId, productId, quantity) {
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (!location)
            throw new Error('Location not found');
        const strategy = location.removalStrategy || 'FIFO';
        let orderBy = { purchaseDate: 'asc' };
        if (strategy === 'LIFO')
            orderBy = { purchaseDate: 'desc' };
        if (strategy === 'FEFO')
            orderBy = { expiryDate: 'asc' };
        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                locationId: locationId,
                productId: productId,
                currentQuantity: { gt: 0 },
                status: 'Active',
            },
            orderBy: orderBy,
        });
        const suggestions = [];
        let remaining = quantity;
        for (const batch of batches) {
            if (remaining <= 0)
                break;
            const take = Math.min(remaining, batch.currentQuantity);
            suggestions.push({ batchId: batch.id, quantity: take });
            remaining -= take;
        }
        return suggestions;
    }
    async createPackage(data) {
        return this.prisma.package.create({
            data: {
                name: data.name,
                type: data.type,
                locationId: data.locationId,
            },
        });
    }
    async getPackages() {
        return this.prisma.package.findMany({
            include: { location: true, batches: { include: { product: true } } },
        });
    }
    async assignBatchToPackage(batchId, packageId) {
        return this.prisma.inventoryBatch.update({
            where: { id: batchId },
            data: { packageId },
        });
    }
    async createRule(data) {
        return this.prisma.rule.create({
            data: {
                routeId: data.routeId,
                action: data.action,
                sourceLocationId: data.sourceLocationId,
                destinationLocationId: data.destinationLocationId,
                sequence: data.sequence,
            },
        });
    }
    async createTransfer(data) {
        await this.validateLocationForStock(data.destinationLocationId);
        return this.prisma.$transaction(async (tx) => {
            const sourceBatch = await tx.inventoryBatch.findFirst({
                where: {
                    productId: data.productId,
                    locationId: data.sourceLocationId,
                    currentQuantity: { gte: data.quantity },
                    status: 'Active',
                },
                orderBy: { purchaseDate: 'asc' },
            });
            if (!sourceBatch) {
                throw new Error('Insufficient stock in source location');
            }
            await tx.inventoryBatch.update({
                where: { id: sourceBatch.id },
                data: { currentQuantity: { decrement: data.quantity } },
            });
            await tx.inventoryBatch.create({
                data: {
                    productId: data.productId,
                    locationId: data.destinationLocationId,
                    initialQuantity: data.quantity,
                    currentQuantity: data.quantity,
                    purchaseDate: sourceBatch.purchaseDate,
                    expiryDate: sourceBatch.expiryDate,
                    batchNumber: sourceBatch.batchNumber,
                    supplierId: sourceBatch.supplierId,
                    status: 'Active',
                },
            });
            await tx.stockTransaction.create({
                data: {
                    productId: data.productId,
                    quantity: data.quantity,
                    type: 'TRANSFER',
                    locationId: data.destinationLocationId,
                    reason: data.reason || 'Internal Transfer',
                },
            });
            return { success: true };
        });
    }
    async createReorderingRule(data) {
        return this.prisma.reorderingRule.create({
            data: {
                productId: data.productId,
                locationId: data.locationId,
                minQuantity: data.minQuantity,
                maxQuantity: data.maxQuantity,
            },
        });
    }
    async getReorderingRules() {
        return this.prisma.reorderingRule.findMany({
            include: { product: true, location: true },
        });
    }
    async checkReorderingRules() {
        const rules = await this.prisma.reorderingRule.findMany({
            where: { active: true },
            include: { product: true, location: true },
        });
        const suggestions = [];
        for (const rule of rules) {
            const stock = await this.prisma.inventoryBatch.aggregate({
                where: {
                    productId: rule.productId,
                    locationId: rule.locationId,
                    status: 'Active',
                },
                _sum: { currentQuantity: true },
            });
            const currentQty = stock._sum.currentQuantity || 0;
            if (currentQty < rule.minQuantity) {
                suggestions.push({
                    ruleId: rule.id,
                    product: rule.product,
                    location: rule.location,
                    currentQuantity: currentQty,
                    minQuantity: rule.minQuantity,
                    maxQuantity: rule.maxQuantity,
                    suggestedOrder: rule.maxQuantity - currentQty,
                });
            }
        }
        return suggestions;
    }
    async getValuation() {
        var _a;
        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                currentQuantity: { gt: 0 },
            },
            include: {
                product: true,
                location: true,
            },
        });
        const valuationByProduct = {};
        let totalValue = 0;
        for (const batch of batches) {
            const value = batch.currentQuantity * batch.costPerUnit;
            totalValue += value;
            if (!valuationByProduct[batch.productId]) {
                valuationByProduct[batch.productId] = {
                    productId: batch.productId,
                    productName: batch.product.name,
                    sku: batch.product.sku,
                    totalQuantity: 0,
                    totalValue: 0,
                    batches: [],
                };
            }
            valuationByProduct[batch.productId].totalQuantity += batch.currentQuantity;
            valuationByProduct[batch.productId].totalValue += value;
            valuationByProduct[batch.productId].batches.push({
                batchNumber: batch.batchNumber,
                quantity: batch.currentQuantity,
                cost: batch.costPerUnit,
                value: value,
                location: ((_a = batch.location) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
            });
        }
        return {
            totalValue,
            products: Object.values(valuationByProduct),
        };
    }
    async getStockMoves() {
        return this.prisma.stockTransaction.findMany({
            orderBy: { date: 'desc' },
            include: {
                product: true,
                batch: { include: { location: true } },
            },
            take: 100,
        });
    }
    async checkCycleCounts() {
        const today = new Date();
        const locations = await this.prisma.location.findMany({
            where: {
                nextInventoryDate: { lte: today },
                inventoryFrequency: { gt: 0 },
            },
            include: {
                warehouse: true,
            },
        });
        return locations;
    }
    async getTransitItems() {
        return this.prisma.inventoryBatch.findMany({
            where: {
                location: {
                    type: 'TRANSIT',
                },
                currentQuantity: { gt: 0 },
            },
            include: {
                product: true,
                location: true,
                warehouse: true,
            },
        });
    }
    async createCycleCountAdjustments(locationIds) {
        const adjustments = [];
        for (const locationId of locationIds) {
            const batches = await this.prisma.inventoryBatch.findMany({
                where: { locationId, currentQuantity: { gt: 0 } },
            });
            for (const batch of batches) {
                const adjustment = await this.createAdjustment({
                    locationId,
                    productId: batch.productId,
                    batchId: batch.id,
                    currentQuantity: batch.currentQuantity,
                    countedQuantity: batch.currentQuantity,
                    reason: 'Cycle Count',
                    status: 'DRAFT',
                });
                adjustments.push(adjustment);
            }
        }
        return adjustments;
    }
    async validateLocationForStock(locationId) {
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (!location)
            throw new Error('Location not found');
        if (location.type === 'VIEW') {
            throw new Error(`Cannot store stock in a VIEW location: ${location.name}`);
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map