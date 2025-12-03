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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
        return this.prisma.$transaction(async (tx) => {
            const viewLocation = await tx.location.create({
                data: {
                    name: data.shortName || data.name,
                    type: 'VIEW',
                },
            });
            const stockLocation = await tx.location.create({
                data: {
                    name: 'Stock',
                    parentId: viewLocation.id,
                    type: 'INTERNAL',
                },
            });
            const warehouse = await tx.warehouse.create({
                data: Object.assign(Object.assign({}, data), { location: JSON.stringify(data.location), viewLocationId: viewLocation.id }),
            });
            await tx.location.update({
                where: { id: viewLocation.id },
                data: { warehouseId: warehouse.id },
            });
            await tx.location.update({
                where: { id: stockLocation.id },
                data: { warehouseId: warehouse.id },
            });
            const createRouteWithRules = async (name, rules) => {
                const route = await tx.route.create({
                    data: { name: `${data.shortName}: ${name}` }
                });
                for (const [index, rule] of rules.entries()) {
                    await tx.rule.create({
                        data: {
                            routeId: route.id,
                            action: rule.action,
                            sourceLocationId: rule.sourceLocationId,
                            destinationLocationId: rule.destinationLocationId,
                            sequence: index,
                        }
                    });
                }
            };
            if (data.incomingSteps === '2_steps') {
                const inputLocation = await tx.location.create({
                    data: { name: 'Input', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Receive in 2 steps', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: inputLocation.id },
                    { action: 'PUSH', sourceLocationId: inputLocation.id, destinationLocationId: stockLocation.id }
                ]);
            }
            else if (data.incomingSteps === '3_steps') {
                const inputLocation = await tx.location.create({
                    data: { name: 'Input', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                const qualityLocation = await tx.location.create({
                    data: { name: 'Quality Control', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Receive in 3 steps', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: inputLocation.id },
                    { action: 'PUSH', sourceLocationId: inputLocation.id, destinationLocationId: qualityLocation.id },
                    { action: 'PUSH', sourceLocationId: qualityLocation.id, destinationLocationId: stockLocation.id }
                ]);
            }
            else {
                await createRouteWithRules('Receive in 1 step', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: stockLocation.id }
                ]);
            }
            if (data.outgoingSteps === '2_steps') {
                const outputLocation = await tx.location.create({
                    data: { name: 'Output', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Deliver in 2 steps', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: outputLocation.id },
                    { action: 'PULL', sourceLocationId: outputLocation.id, destinationLocationId: null }
                ]);
            }
            else if (data.outgoingSteps === '3_steps') {
                const packingLocation = await tx.location.create({
                    data: { name: 'Packing Zone', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                const outputLocation = await tx.location.create({
                    data: { name: 'Output', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Deliver in 3 steps', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: packingLocation.id },
                    { action: 'PULL', sourceLocationId: packingLocation.id, destinationLocationId: outputLocation.id },
                    { action: 'PULL', sourceLocationId: outputLocation.id, destinationLocationId: null }
                ]);
            }
            else {
                await createRouteWithRules('Deliver in 1 step', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: null }
                ]);
            }
            return warehouse;
        });
    }
    async updateWarehouse(id, data) {
        const { location } = data, rest = __rest(data, ["location"]);
        const updateData = Object.assign({}, rest);
        if (location) {
            updateData.location = JSON.stringify(location);
        }
        return this.prisma.warehouse.update({
            where: { id },
            data: updateData,
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
    async getLocations(warehouseId) {
        const where = warehouseId ? { warehouseId } : {};
        return this.prisma.location.findMany({
            where,
            include: { warehouseView: true },
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
                    maxQuantity: data.quantity,
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
    async createRoute(data) {
        return this.prisma.route.create({
            data: {
                name: data.name,
                description: data.description,
            },
        });
    }
    async getRoutes() {
        return this.prisma.route.findMany({
            include: { rules: true },
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
            await tx.stockTransaction.create({
                data: {
                    productId: data.productId,
                    quantity: data.quantity,
                    type: 'TRANSFER',
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
    async getStockTransactions() {
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
                warehouseView: true,
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
    async createStockMove(data, tx) {
        const prisma = tx || this.prisma;
        const move = await prisma.stockMove.create({
            data: {
                productId: data.productId,
                quantity: data.quantity,
                sourceLocationId: data.sourceLocationId,
                destinationLocationId: data.destinationLocationId,
                ruleId: data.ruleId,
                origin: data.origin,
                batchId: data.batchId,
                status: data.status || 'DRAFT',
            },
        });
        if (move.sourceLocationId) {
            await this.checkProcurement(move.productId, move.quantity, move.sourceLocationId, prisma);
        }
        return move;
    }
    async checkProcurement(productId, quantity, locationId, tx) {
        const prisma = tx || this.prisma;
        const rules = await prisma.rule.findMany({
            where: {
                destinationLocationId: locationId,
                action: 'PULL',
            },
            orderBy: { sequence: 'asc' }
        });
        for (const rule of rules) {
            await this.createStockMove({
                productId,
                quantity,
                sourceLocationId: rule.sourceLocationId,
                destinationLocationId: locationId,
                ruleId: rule.id,
                status: 'WAITING',
                origin: 'Procurement',
            }, prisma);
        }
    }
    async getStockMoves(status) {
        const where = status ? { status } : {};
        return this.prisma.stockMove.findMany({
            where,
            include: { product: true, sourceLocation: true, destinationLocation: true, rule: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async validateStockMove(id) {
        return this.prisma.$transaction(async (tx) => {
            const move = await tx.stockMove.findUnique({ where: { id } });
            if (!move)
                throw new Error('Stock move not found');
            if (move.status === 'DONE')
                throw new Error('Stock move already done');
            if (move.sourceLocationId && move.destinationLocationId) {
                const sourceBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: move.productId,
                        locationId: move.sourceLocationId,
                        currentQuantity: { gte: move.quantity },
                        status: 'Active',
                    },
                    orderBy: { purchaseDate: 'asc' },
                });
                if (sourceBatch) {
                    await tx.inventoryBatch.update({
                        where: { id: sourceBatch.id },
                        data: { currentQuantity: { decrement: move.quantity } },
                    });
                }
                const destLocation = await tx.location.findUnique({ where: { id: move.destinationLocationId } });
                if (destLocation && destLocation.warehouseId) {
                    if (move.batchId) {
                    }
                    else {
                        await tx.inventoryBatch.create({
                            data: {
                                productId: move.productId,
                                locationId: move.destinationLocationId,
                                warehouseId: destLocation.warehouseId,
                                initialQuantity: move.quantity,
                                currentQuantity: move.quantity,
                                costPerUnit: sourceBatch ? sourceBatch.costPerUnit : 0,
                                purchaseDate: sourceBatch ? sourceBatch.purchaseDate : new Date(),
                                status: 'Active',
                                batchNumber: `MOVE-${Date.now()}`
                            }
                        });
                    }
                }
            }
            else if (!move.sourceLocationId && move.destinationLocationId) {
                const destLocation = await tx.location.findUnique({ where: { id: move.destinationLocationId } });
                if (destLocation && destLocation.warehouseId) {
                    await tx.inventoryBatch.create({
                        data: {
                            productId: move.productId,
                            locationId: move.destinationLocationId,
                            warehouseId: destLocation.warehouseId,
                            initialQuantity: move.quantity,
                            currentQuantity: move.quantity,
                            costPerUnit: 0,
                            purchaseDate: new Date(),
                            status: 'Active',
                            batchNumber: `REC-${Date.now()}`
                        }
                    });
                }
            }
            else if (move.sourceLocationId && !move.destinationLocationId) {
                const sourceBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: move.productId,
                        locationId: move.sourceLocationId,
                        currentQuantity: { gte: move.quantity },
                        status: 'Active',
                    },
                    orderBy: { purchaseDate: 'asc' },
                });
                if (sourceBatch) {
                    await tx.inventoryBatch.update({
                        where: { id: sourceBatch.id },
                        data: { currentQuantity: { decrement: move.quantity } },
                    });
                }
            }
            const updatedMove = await tx.stockMove.update({
                where: { id },
                data: { status: 'DONE' },
            });
            if (move.destinationLocationId) {
                const pushRules = await tx.rule.findMany({
                    where: {
                        sourceLocationId: move.destinationLocationId,
                        action: 'PUSH',
                    },
                    orderBy: { sequence: 'asc' }
                });
                for (const rule of pushRules) {
                    await tx.stockMove.create({
                        data: {
                            productId: move.productId,
                            quantity: move.quantity,
                            sourceLocationId: move.destinationLocationId,
                            destinationLocationId: rule.destinationLocationId,
                            ruleId: rule.id,
                            origin: move.origin,
                            status: 'WAITING',
                        }
                    });
                }
            }
            return updatedMove;
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map