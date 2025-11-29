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
exports.StrategyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let StrategyService = class StrategyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluatePickingStrategy(orderData) {
        const activeStrategy = await this.prisma.pickingStrategy.findFirst({
            where: { active: true },
        });
        if (activeStrategy && activeStrategy.name !== 'Wave') {
        }
        if (orderData.priority === 'HIGH')
            return 'Single';
        if (orderData.itemCount > 20)
            return 'Batch';
        const zones = new Set(orderData.items.map(i => i.zone));
        if (zones.size === 1 && orderData.items.length > 1)
            return 'Cluster';
        return 'Wave';
    }
    async evaluateReservationStrategy(productData) {
        const fefo = await this.prisma.reservationStrategy.findUnique({ where: { name: 'FEFO' } });
        if (productData.isPerishable && (fefo === null || fefo === void 0 ? void 0 : fefo.active)) {
            return 'FEFO';
        }
        return 'FIFO';
    }
    async getPickingStrategies() {
        return this.prisma.pickingStrategy.findMany();
    }
    async getReservationStrategies() {
        return this.prisma.reservationStrategy.findMany();
    }
    async togglePickingStrategy(id, active) {
        return this.prisma.pickingStrategy.update({
            where: { id },
            data: { active },
        });
    }
    async toggleReservationStrategy(id, active) {
        return this.prisma.reservationStrategy.update({
            where: { id },
            data: { active },
        });
    }
};
exports.StrategyService = StrategyService;
exports.StrategyService = StrategyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StrategyService);
//# sourceMappingURL=strategy.service.js.map