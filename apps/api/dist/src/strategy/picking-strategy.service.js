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
exports.PickingStrategyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let PickingStrategyService = class PickingStrategyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBatch(criteria = 'location') {
        const pendingOrders = await this.prisma.order.findMany({
            where: { status: 'PENDING' },
            include: { items: true }
        });
        if (pendingOrders.length === 0)
            return { message: 'No pending orders to batch.' };
        const batches = {};
        for (const order of pendingOrders) {
            let key = 'default';
            if (criteria === 'contact') {
                key = order.customerId || 'Unknown';
            }
            else if (criteria === 'carrier') {
                key = 'Carrier-Default';
            }
            else if (criteria === 'location') {
                key = 'Zone-A';
            }
            if (!batches[key])
                batches[key] = [];
            batches[key].push(order);
        }
        return {
            type: 'BATCH',
            criteria,
            generatedBatches: Object.entries(batches).map(([key, orders]) => ({
                batchKey: key,
                orderCount: orders.length,
                orderIds: orders.map(o => o.id)
            }))
        };
    }
    async createClusterBatch(maxSize = 4) {
        const pendingOrders = await this.prisma.order.findMany({
            where: { status: 'PENDING' },
            take: maxSize,
            orderBy: { createdAt: 'asc' },
            include: { items: true }
        });
        if (pendingOrders.length === 0)
            return { message: 'No pending orders for cluster.' };
        const cluster = pendingOrders.map((order, index) => ({
            orderId: order.id,
            toteLabel: `TOTE-${index + 1}`,
            items: order.items
        }));
        return {
            type: 'CLUSTER',
            clusterId: `CLUSTER-${Date.now()}`,
            assignments: cluster
        };
    }
    async createWave(criteria = 'product') {
        const pendingOrders = await this.prisma.order.findMany({
            where: { status: 'PENDING' },
            include: { items: { include: { product: true } } }
        });
        if (pendingOrders.length === 0)
            return { message: 'No pending orders for wave.' };
        const waveItems = {};
        for (const order of pendingOrders) {
            for (const item of order.items) {
                let key = item.productId;
                if (criteria === 'category') {
                    key = item.product.category || 'Uncategorized';
                }
                if (!waveItems[key]) {
                    waveItems[key] = {
                        productId: item.productId,
                        productName: criteria === 'category' ? key : item.product.name,
                        totalQty: 0,
                        orderIds: []
                    };
                }
                waveItems[key].totalQty += item.quantity;
                if (!waveItems[key].orderIds.includes(order.id)) {
                    waveItems[key].orderIds.push(order.id);
                }
            }
        }
        return {
            type: 'WAVE',
            criteria,
            waveId: `WAVE-${Date.now()}`,
            pickingList: Object.values(waveItems)
        };
    }
};
exports.PickingStrategyService = PickingStrategyService;
exports.PickingStrategyService = PickingStrategyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PickingStrategyService);
//# sourceMappingURL=picking-strategy.service.js.map