import { Controller, Post, Body, Get, Patch, Param } from '@nestjs/common';
import { StrategyService } from './strategy.service';

@Controller('strategy')
export class StrategyController {
    constructor(private readonly strategyService: StrategyService) { }

    @Post('picking')
    evaluatePicking(@Body() data: { priority: string; itemCount: number; items: any[] }) {
        return this.strategyService.evaluatePickingStrategy(data);
    }

    @Post('reservation')
    evaluateReservation(@Body() data: { isPerishable: boolean; location: any }) {
        return this.strategyService.evaluateReservationStrategy(data);
    }

    @Get('picking')
    getPickingStrategies() {
        return this.strategyService.getPickingStrategies();
    }

    @Get('reservation')
    getReservationStrategies() {
        return this.strategyService.getReservationStrategies();
    }

    @Patch('picking/:id')
    togglePicking(@Param('id') id: string, @Body('active') active: boolean) {
        return this.strategyService.togglePickingStrategy(id, active);
    }

    @Patch('reservation/:id')
    toggleReservation(@Param('id') id: string, @Body('active') active: boolean) {
        return this.strategyService.toggleReservationStrategy(id, active);
    }
}
