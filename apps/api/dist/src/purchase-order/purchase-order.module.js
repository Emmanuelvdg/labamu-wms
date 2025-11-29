"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrderModule = void 0;
const common_1 = require("@nestjs/common");
const purchase_order_controller_1 = require("./purchase-order.controller");
const purchase_order_service_1 = require("./purchase-order.service");
const prisma_service_1 = require("../prisma.service");
const inventory_module_1 = require("../inventory/inventory.module");
const rule_module_1 = require("../rule/rule.module");
let PurchaseOrderModule = class PurchaseOrderModule {
};
exports.PurchaseOrderModule = PurchaseOrderModule;
exports.PurchaseOrderModule = PurchaseOrderModule = __decorate([
    (0, common_1.Module)({
        imports: [inventory_module_1.InventoryModule, rule_module_1.RuleModule],
        controllers: [purchase_order_controller_1.PurchaseOrderController],
        providers: [purchase_order_service_1.PurchaseOrderService, prisma_service_1.PrismaService],
        exports: [purchase_order_service_1.PurchaseOrderService],
    })
], PurchaseOrderModule);
//# sourceMappingURL=purchase-order.module.js.map