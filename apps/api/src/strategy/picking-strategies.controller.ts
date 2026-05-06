import { Controller, Get, Query } from '@nestjs/common';
import { StrategyService } from './strategy.service';

@Controller('picking-strategies')
export class PickingStrategiesController {
    constructor(private readonly strategyService: StrategyService) {}

    @Get()
    list(@Query('warehouseId') warehouseId: string) {
        return this.strategyService.getPickingStrategies(warehouseId);
    }
}
