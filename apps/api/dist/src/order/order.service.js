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
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const strategy_service_1 = require("../strategy/strategy.service");
const inventory_service_1 = require("../inventory/inventory.service");
let OrderService = class OrderService {
    constructor(prisma, strategyService, inventoryService) {
        this.prisma = prisma;
        this.strategyService = strategyService;
        this.inventoryService = inventoryService;
    }
    async createOrder(data) {
        const order = await this.prisma.order.create({
            data: {
                customerId: data.customerId,
                priority: data.priority,
                status: 'PENDING',
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: { items: true },
        });
        const pickingStrategy = await this.strategyService.evaluatePickingStrategy({
            priority: data.priority,
            itemCount: data.items.length,
            items: [],
        });
        const reservationStrategy = 'FIFO';
        await this.inventoryService.reserveStock({
            orderId: order.id,
            items: data.items,
            strategy: reservationStrategy,
        });
        return this.prisma.order.update({
            where: { id: order.id },
            data: { status: 'RESERVED' },
            include: { items: true },
        });
    }
    async getOrders() {
        return this.prisma.order.findMany({
            include: { items: true, reservations: true, shipment: true },
        });
    }
    async createShipment(data) {
        return this.prisma.$transaction(async (tx) => {
            const shipment = await tx.shipment.create({
                data: {
                    orderId: data.orderId,
                    carrier: data.carrier,
                    trackingId: data.trackingId,
                    status: 'SHIPPED',
                },
            });
            await tx.order.update({
                where: { id: data.orderId },
                data: { status: 'SHIPPED' },
            });
            const reservations = await tx.reservation.findMany({
                where: { orderId: data.orderId },
            });
            for (const res of reservations) {
                const inventory = await tx.productInventory.findFirst({
                    where: { productId: res.productId, reserved: { gte: res.quantity } },
                });
                if (inventory) {
                    await tx.productInventory.update({
                        where: { id: inventory.id },
                        data: {
                            quantity: { decrement: res.quantity },
                            reserved: { decrement: res.quantity },
                        },
                    });
                }
                await tx.stockTransaction.create({
                    data: {
                        productId: res.productId,
                        type: 'OUT',
                        quantity: res.quantity,
                        referenceId: data.orderId,
                        date: new Date(),
                    },
                });
            }
            return shipment;
        });
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        strategy_service_1.StrategyService,
        inventory_service_1.InventoryService])
], OrderService);
//# sourceMappingURL=order.service.js.map