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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const fs = __importStar(require("fs"));
let InventoryController = class InventoryController {
    log(message) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[InventoryController] ${message}\n`);
    }
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    createProduct(data) {
        return this.inventoryService.createProduct(data);
    }
    getProducts() {
        return this.inventoryService.getProducts();
    }
    createWarehouse(data) {
        return this.inventoryService.createWarehouse(data);
    }
    updateWarehouse(id, data) {
        return this.inventoryService.updateWarehouse(id, data);
    }
    getWarehouses() {
        return this.inventoryService.getWarehouses();
    }
    addBatch(data) {
        return this.inventoryService.addBatch(Object.assign(Object.assign({}, data), { purchaseDate: new Date(data.purchaseDate), expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined, batchNumber: data.batchNumber }));
    }
    getBatches(productId) {
        return this.inventoryService.getBatches(productId);
    }
    getTransactions(productId) {
        return this.inventoryService.getTransactions(productId);
    }
    async createAdjustment(data) {
        this.log(`createAdjustment called with ${JSON.stringify(data)}`);
        try {
            return await this.inventoryService.createAdjustment(data);
        }
        catch (e) {
            this.log(`Error in controller createAdjustment: ${e.message}`);
            throw e;
        }
    }
    updateAdjustment(id, data) {
        return this.inventoryService.updateAdjustment(id, data);
    }
    applyAdjustment(id) {
        return this.inventoryService.applyAdjustment(id);
    }
    getAdjustments() {
        return this.inventoryService.getAdjustments();
    }
    createScrapOrder(data) {
        return this.inventoryService.createScrapOrder(data);
    }
    getScrapOrders() {
        return this.inventoryService.getScrapOrders();
    }
    createTransfer(data) {
        return this.inventoryService.createTransfer(data);
    }
    createReorderingRule(data) {
        return this.inventoryService.createReorderingRule(data);
    }
    getReorderingRules() {
        return this.inventoryService.getReorderingRules();
    }
    checkReorderingRules() {
        return this.inventoryService.checkReorderingRules();
    }
    getValuation() {
        return this.inventoryService.getValuation();
    }
    getStockTransactions() {
        return this.inventoryService.getStockTransactions();
    }
    createStockMove(data) {
        return this.inventoryService.createStockMove(data);
    }
    getStockMoves(status) {
        return this.inventoryService.getStockMoves(status);
    }
    validateStockMove(id) {
        return this.inventoryService.validateStockMove(id);
    }
    getLocationsTree(warehouseId) {
        return this.inventoryService.getLocationsTree(warehouseId);
    }
    getLocations(warehouseId) {
        return this.inventoryService.getLocations(warehouseId);
    }
    createLocation(data) {
        return this.inventoryService.createLocation(data);
    }
    moveLocation(id, data) {
        return this.inventoryService.moveLocation(id, data.newParentId);
    }
    createPutawayRule(data) {
        return this.inventoryService.createPutawayRule(data);
    }
    getPutawayRules() {
        return this.inventoryService.getPutawayRules();
    }
    createPackage(data) {
        return this.inventoryService.createPackage(data);
    }
    getPackages() {
        return this.inventoryService.getPackages();
    }
    assignBatchToPackage(packageId, data) {
        return this.inventoryService.assignBatchToPackage(data.batchId, packageId);
    }
    createRoute(data) {
        return this.inventoryService.createRoute(data);
    }
    getRoutes() {
        return this.inventoryService.getRoutes();
    }
    createRule(routeId, data) {
        return this.inventoryService.createRule(Object.assign(Object.assign({}, data), { routeId }));
    }
    updateRule(id, data) {
        return this.inventoryService.updateRule(id, data);
    }
    async checkCycleCounts() {
        return this.inventoryService.checkCycleCounts();
    }
    async startCycleCount(data) {
        return this.inventoryService.createCycleCountAdjustments(data.locationIds);
    }
    getTransitItems() {
        return this.inventoryService.getTransitItems();
    }
    getInventory(productId) {
        return this.inventoryService.getInventory(productId);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('products'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Get)('products'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createWarehouse", null);
__decorate([
    (0, common_1.Put)('warehouses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateWarehouse", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getWarehouses", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "addBatch", null);
__decorate([
    (0, common_1.Get)('batch/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getBatches", null);
__decorate([
    (0, common_1.Get)('transactions/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('adjustments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createAdjustment", null);
__decorate([
    (0, common_1.Put)('adjustments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateAdjustment", null);
__decorate([
    (0, common_1.Post)('adjustments/:id/apply'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "applyAdjustment", null);
__decorate([
    (0, common_1.Get)('adjustments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getAdjustments", null);
__decorate([
    (0, common_1.Post)('scrap'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createScrapOrder", null);
__decorate([
    (0, common_1.Get)('scrap'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getScrapOrders", null);
__decorate([
    (0, common_1.Post)('transfer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createTransfer", null);
__decorate([
    (0, common_1.Post)('reordering-rules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createReorderingRule", null);
__decorate([
    (0, common_1.Get)('reordering-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getReorderingRules", null);
__decorate([
    (0, common_1.Get)('reordering-rules/check'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "checkReorderingRules", null);
__decorate([
    (0, common_1.Get)('valuation'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getValuation", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStockTransactions", null);
__decorate([
    (0, common_1.Post)('moves'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createStockMove", null);
__decorate([
    (0, common_1.Get)('moves'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStockMoves", null);
__decorate([
    (0, common_1.Post)('moves/:id/validate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "validateStockMove", null);
__decorate([
    (0, common_1.Get)('locations/tree'),
    __param(0, (0, common_1.Query)('warehouseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLocationsTree", null);
__decorate([
    (0, common_1.Get)('locations'),
    __param(0, (0, common_1.Query)('warehouseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLocations", null);
__decorate([
    (0, common_1.Post)('locations'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Put)('locations/:id/move'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "moveLocation", null);
__decorate([
    (0, common_1.Post)('putaway-rules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createPutawayRule", null);
__decorate([
    (0, common_1.Get)('putaway-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getPutawayRules", null);
__decorate([
    (0, common_1.Post)('packages'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createPackage", null);
__decorate([
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getPackages", null);
__decorate([
    (0, common_1.Post)('packages/:packageId/assign'),
    __param(0, (0, common_1.Param)('packageId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "assignBatchToPackage", null);
__decorate([
    (0, common_1.Post)('routes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createRoute", null);
__decorate([
    (0, common_1.Get)('routes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getRoutes", null);
__decorate([
    (0, common_1.Post)('routes/:routeId/rules'),
    __param(0, (0, common_1.Param)('routeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Get)('cycle-counts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "checkCycleCounts", null);
__decorate([
    (0, common_1.Post)('cycle-counts/start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "startCycleCount", null);
__decorate([
    (0, common_1.Get)('transit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getTransitItems", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getInventory", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map