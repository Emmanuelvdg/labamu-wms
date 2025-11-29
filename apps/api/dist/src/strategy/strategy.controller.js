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
let StrategyController = class StrategyController {
    constructor(strategyService) {
        this.strategyService = strategyService;
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
exports.StrategyController = StrategyController = __decorate([
    (0, common_1.Controller)('strategy'),
    __metadata("design:paramtypes", [strategy_service_1.StrategyService])
], StrategyController);
//# sourceMappingURL=strategy.controller.js.map