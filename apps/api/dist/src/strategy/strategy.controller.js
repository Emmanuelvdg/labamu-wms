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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyController = void 0;
const common_1 = require("@nestjs/common");
const strategy_service_1 = require("./strategy.service");
const picking_strategy_service_1 = require("./picking-strategy.service");
let StrategyController = class StrategyController {
    constructor(strategyService, pickingStrategyService) {
        this.strategyService = strategyService;
        this.pickingStrategyService = pickingStrategyService;
    }
    evaluatePicking(data) {
        return this.strategyService.evaluatePickingStrategy(data);
    }
    evaluateReservation(data) {
        return this.strategyService.evaluateReservationStrategy(data);
    }
    getPickingStrategies() {
        return this.strategyService.getPickingStrategies();
    }
    getReservationStrategies() {
        return this.strategyService.getReservationStrategies();
    }
    togglePicking(id, active) {
        return this.strategyService.togglePickingStrategy(id, active);
    }
    toggleReservation(id, active) {
        return this.strategyService.toggleReservationStrategy(id, active);
    }
    createPickingStrategy(data) {
        return this.strategyService.createPickingStrategy(data);
    }
    updatePickingStrategy(id, data) {
        return this.strategyService.updatePickingStrategy(id, data);
    }
    deletePickingStrategy(id) {
        return this.strategyService.deletePickingStrategy(id);
    }
    createReservationStrategy(data) {
        return this.strategyService.createReservationStrategy(data);
    }
    updateReservationStrategy(id, data) {
        return this.strategyService.updateReservationStrategy(id, data);
    }
    deleteReservationStrategy(id) {
        return this.strategyService.deleteReservationStrategy(id);
    }
    createBatch(data) {
        return this.pickingStrategyService.createBatch(data.criteria);
    }
    createCluster(data) {
        return this.pickingStrategyService.createClusterBatch(data.size);
    }
    createWave(data) {
        return this.pickingStrategyService.createWave(data.criteria);
    }
};
exports.StrategyController = StrategyController;
__decorate([
    (0, common_1.Post)('picking'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "evaluatePicking", null);
__decorate([
    (0, common_1.Post)('reservation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "evaluateReservation", null);
__decorate([
    (0, common_1.Get)('picking'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "getPickingStrategies", null);
__decorate([
    (0, common_1.Get)('reservation'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "getReservationStrategies", null);
__decorate([
    (0, common_1.Patch)('picking/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "togglePicking", null);
__decorate([
    (0, common_1.Patch)('reservation/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "toggleReservation", null);
__decorate([
    (0, common_1.Post)('picking/create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "createPickingStrategy", null);
__decorate([
    (0, common_1.Put)('picking/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "updatePickingStrategy", null);
__decorate([
    (0, common_1.Delete)('picking/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "deletePickingStrategy", null);
__decorate([
    (0, common_1.Post)('reservation/create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "createReservationStrategy", null);
__decorate([
    (0, common_1.Put)('reservation/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "updateReservationStrategy", null);
__decorate([
    (0, common_1.Delete)('reservation/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "deleteReservationStrategy", null);
__decorate([
    (0, common_1.Post)('picking/batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "createBatch", null);
__decorate([
    (0, common_1.Post)('picking/cluster'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "createCluster", null);
__decorate([
    (0, common_1.Post)('picking/wave'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StrategyController.prototype, "createWave", null);
exports.StrategyController = StrategyController = __decorate([
    (0, common_1.Controller)('strategy'),
    __metadata("design:paramtypes", [strategy_service_1.StrategyService,
        picking_strategy_service_1.PickingStrategyService])
], StrategyController);
//# sourceMappingURL=strategy.controller.js.map