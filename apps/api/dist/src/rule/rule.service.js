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
var RuleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let RuleService = RuleService_1 = class RuleService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
        this.logger = new common_1.Logger(RuleService_1.name);
    }
    async applyPushRules(productId, locationId, quantity) {
        var _a, _b;
        this.logger.log(`Checking PUSH rules for Product ${productId} at Location ${locationId}`);
        const rules = await this.prisma.rule.findMany({
            where: {
                sourceLocationId: locationId,
                action: 'PUSH',
            },
            orderBy: { sequence: 'asc' },
            include: { destinationLocation: true },
        });
        if (rules.length === 0) {
            this.logger.log('No PUSH rules found.');
            return;
        }
        for (const rule of rules) {
            if (!rule.destinationLocationId)
                continue;
            this.logger.log(`Applying Rule ${rule.id}: PUSH to ${(_a = rule.destinationLocation) === null || _a === void 0 ? void 0 : _a.name}`);
            try {
                await this.inventoryService.createTransfer({
                    productId: productId,
                    sourceLocationId: locationId,
                    destinationLocationId: rule.destinationLocationId,
                    quantity: quantity,
                    reason: `Auto-Push Rule: ${rule.routeId || 'Default'}`,
                });
                this.logger.log(`Successfully pushed ${quantity} units to ${(_b = rule.destinationLocation) === null || _b === void 0 ? void 0 : _b.name}`);
                await this.applyPushRules(productId, rule.destinationLocationId, quantity);
            }
            catch (error) {
                this.logger.error(`Failed to apply rule ${rule.id}: ${error.message}`);
                break;
            }
        }
    }
};
exports.RuleService = RuleService;
exports.RuleService = RuleService = RuleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], RuleService);
//# sourceMappingURL=rule.service.js.map