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
exports.StrategyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const fs = __importStar(require("fs"));
let StrategyService = class StrategyService {
    log(message) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[StrategyService] ${message}\n`);
    }
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
        const strategies = await this.prisma.reservationStrategy.findMany();
        this.log(`Found ${strategies.length} strategies.`);
        strategies.forEach(s => this.log(`- ${s.name}: active=${s.active}, id=${s.id}`));
        return strategies;
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
    async createPickingStrategy(data) {
        return this.prisma.pickingStrategy.create({
            data: {
                name: data.name,
                rules: data.rules || '{}',
                active: true,
            },
        });
    }
    async updatePickingStrategy(id, data) {
        return this.prisma.pickingStrategy.update({
            where: { id },
            data,
        });
    }
    async deletePickingStrategy(id) {
        return this.prisma.pickingStrategy.delete({
            where: { id },
        });
    }
    async createReservationStrategy(data) {
        this.log(`Creating strategy: ${data.name}, active: true`);
        return this.prisma.reservationStrategy.upsert({
            where: { name: data.name },
            update: {
                rules: data.rules || '{}',
                active: true,
            },
            create: {
                name: data.name,
                rules: data.rules || '{}',
                active: true,
            },
        });
    }
    async updateReservationStrategy(id, data) {
        return this.prisma.reservationStrategy.update({
            where: { id },
            data,
        });
    }
    async deleteReservationStrategy(id) {
        return this.prisma.reservationStrategy.delete({
            where: { id },
        });
    }
};
exports.StrategyService = StrategyService;
exports.StrategyService = StrategyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StrategyService);
//# sourceMappingURL=strategy.service.js.map