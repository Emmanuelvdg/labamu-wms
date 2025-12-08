import { Controller, Post, Body, Get, Patch, Param, Put, Delete, Query } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';

@Controller('strategy')
export class StrategyController {
    constructor(
        private readonly strategyService: StrategyService,
        private readonly pickingStrategyService: PickingStrategyService
    ) { }

    @Post('picking')
    evaluatePicking(@Body() data: { priority: string; itemCount: number; items: any[]; warehouseId: string }) {
        return this.strategyService.evaluatePickingStrategy(data);
    }

    @Post('reservation')
    evaluateReservation(@Body() data: { isPerishable: boolean; location: any }) {
        return this.strategyService.evaluateReservationStrategy(data);
    }

    @Get('picking')
    getPickingStrategies(@Query('warehouseId') warehouseId: string) {
        return this.strategyService.getPickingStrategies(warehouseId);
    }

    // ...

    // --- Picking CRUD ---

    @Post('picking/create')
    createPickingStrategy(@Body() data: { name: string; rules?: string; warehouseId: string }) {
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
    createBatch(@Body() data: { criteria: 'contact' | 'carrier' | 'location'; warehouseId?: string }) {
        return this.pickingStrategyService.createBatch(data.criteria, data.warehouseId);
    }

    @Post('picking/cluster')
    createCluster(@Body() data: { size: number; warehouseId?: string }) {
        return this.pickingStrategyService.createClusterBatch(data.size, data.warehouseId);
    }

    @Post('picking/wave')
    createWave(@Body() data: { criteria: 'product' | 'category'; warehouseId?: string }) {
        return this.pickingStrategyService.createWave(data.criteria, data.warehouseId);
    }

    // --- Picking Session Management ---

    @Post('picking/sessions')
    createSession(@Body() data: { warehouseId: string; strategy: 'BATCH' | 'CLUSTER' | 'WAVE' | 'SINGLE'; criteria?: string; maxOrders?: number }) {
        return this.pickingStrategyService.createSession(data);
    }

    @Get('picking/sessions/active')
    getActiveSession(@Query('warehouseId') warehouseId: string) {
        return this.pickingStrategyService.getActiveSession(warehouseId);
    }

    @Patch('picking/tasks/:id')
    updateTask(@Param('id') id: string, @Body() data: { pickedQuantity: number; status: string; exceptionReason?: string }) {
        return this.pickingStrategyService.updateTask(id, data);
    }

    @Post('picking/sessions/:id/complete')
    completeSession(@Param('id') id: string) {
        return this.pickingStrategyService.completeSession(id);
    }
}
