import { Controller, Post, Body, Get, Patch, Param, Put, Delete } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';

@Controller('strategy')
export class StrategyController {
    constructor(
        private readonly strategyService: StrategyService,
        private readonly pickingStrategyService: PickingStrategyService
    ) { }

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

    // --- Picking CRUD ---

    @Post('picking/create')
    createPickingStrategy(@Body() data: { name: string; rules?: string }) {
        return this.strategyService.createPickingStrategy(data);
    }

    @Put('picking/:id')
    updatePickingStrategy(@Param('id') id: string, @Body() data: any) {
        return this.strategyService.updatePickingStrategy(id, data);
    }

    @Delete('picking/:id')
    deletePickingStrategy(@Param('id') id: string) {
        return this.strategyService.deletePickingStrategy(id);
    }

    // --- Reservation CRUD ---

    @Post('reservation/create')
    createReservationStrategy(@Body() data: { name: string; rules?: string }) {
        return this.strategyService.createReservationStrategy(data);
    }

    @Put('reservation/:id')
    updateReservationStrategy(@Param('id') id: string, @Body() data: any) {
        return this.strategyService.updateReservationStrategy(id, data);
    }

    @Delete('reservation/:id')
    deleteReservationStrategy(@Param('id') id: string) {
        return this.strategyService.deleteReservationStrategy(id);
    }

    // --- Advanced Picking Strategies (Batch, Cluster, Wave) ---

    @Post('picking/batch')
    createBatch(@Body() data: { criteria: 'contact' | 'carrier' | 'location' }) {
        return this.pickingStrategyService.createBatch(data.criteria);
    }

    @Post('picking/cluster')
    createCluster(@Body() data: { size: number }) {
        return this.pickingStrategyService.createClusterBatch(data.size);
    }

    @Post('picking/wave')
    createWave(@Body() data: { criteria: 'product' | 'category' }) {
        return this.pickingStrategyService.createWave(data.criteria);
    }
}
