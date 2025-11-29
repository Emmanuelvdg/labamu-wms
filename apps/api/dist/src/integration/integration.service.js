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
exports.IntegrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let IntegrationService = class IntegrationService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async syncSalesChannel(channel) {
        const mockOrders = [
            { externalId: 'ORD-001', items: [{ sku: 'PROD-001', qty: 2 }] },
            { externalId: 'ORD-002', items: [{ sku: 'PROD-002', qty: 1 }] },
        ];
        return {
            channel,
            syncedOrders: mockOrders.length,
            status: 'SUCCESS',
        };
    }
    async syncLogistics(partner) {
        const mockUpdates = [
            { trackingId: 'JNE-001', status: 'DELIVERED' },
            { trackingId: 'JNE-002', status: 'IN_TRANSIT' },
        ];
        return {
            partner,
            updates: mockUpdates.length,
            status: 'SUCCESS',
        };
    }
};
exports.IntegrationService = IntegrationService;
exports.IntegrationService = IntegrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], IntegrationService);
//# sourceMappingURL=integration.service.js.map