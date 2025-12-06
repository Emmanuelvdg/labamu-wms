"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const strategy_service_1 = require("../strategy/strategy.service");
const inventory_service_1 = require("../inventory/inventory.service");
const fs = __importStar(require("fs"));
let OrderService = class OrderService {
    log(message) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[OrderService] ${message}\n`);
    }
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
                expectedDate: data.expectedDate,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: { items: true },
        });
        const reservationStrategies = await this.strategyService.getReservationStrategies();
        let activeStrategy = reservationStrategies.find(s => s.active);
        if (!activeStrategy) {
            this.log('No active strategy found. Checking if any strategy exists...');
            if (reservationStrategies.length > 0) {
                this.log('Falling back to the most recent strategy.');
                activeStrategy = reservationStrategies[reservationStrategies.length - 1];
            }
            else {
                this.log('No strategies defined at all.');
            }
        }
        this.log(`Active Strategy: ${activeStrategy === null || activeStrategy === void 0 ? void 0 : activeStrategy.name} (Active: ${activeStrategy === null || activeStrategy === void 0 ? void 0 : activeStrategy.active}) Rules: ${activeStrategy === null || activeStrategy === void 0 ? void 0 : activeStrategy.rules}`);
        let shouldReserve = true;
        if (activeStrategy) {
            try {
                const rules = JSON.parse(activeStrategy.rules);
                this.log(`Parsed Rules: ${JSON.stringify(rules)}`);
                if (rules.method === 'manually') {
                    shouldReserve = false;
                }
                else if (rules.method === 'before_date') {
                    if (!data.expectedDate) {
                        shouldReserve = true;
                    }
                    else {
                        const daysBefore = rules.daysBefore || 0;
                        const reservationDate = new Date(data.expectedDate);
                        reservationDate.setDate(reservationDate.getDate() - daysBefore);
                        this.log(`Expected: ${data.expectedDate} DaysBefore: ${daysBefore} ResDate: ${reservationDate} Now: ${new Date()}`);
                        if (new Date() < reservationDate) {
                            shouldReserve = false;
                        }
                    }
                }
            }
            catch (e) {
                this.log('Invalid reservation strategy rules, defaulting to immediate reservation');
            }
        }
        this.log(`Should Reserve: ${shouldReserve}`);
        if (shouldReserve) {
            const strategyName = (activeStrategy === null || activeStrategy === void 0 ? void 0 : activeStrategy.name) === 'FEFO' ? 'FEFO' : 'FIFO';
            try {
                await this.inventoryService.reserveStock({
                    orderId: order.id,
                    items: data.items,
                    strategy: strategyName,
                });
                return this.prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'RESERVED' },
                    include: { items: true },
                });
            }
            catch (error) {
                this.log(`Reservation failed (insufficient stock?), keeping order as PENDING. Error: ${error.message}`);
                return order;
            }
        }
        return order;
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