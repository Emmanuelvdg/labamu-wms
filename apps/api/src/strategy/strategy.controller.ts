import { Controller, Post, Body, Get, Patch, Param, Put, Delete, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';
import { WaveReleaseRuleService } from './wave-release-rule.service';

type PickingStrategyType = 'BATCH' | 'CLUSTER' | 'WAVE' | 'SINGLE' | 'WAVELESS' | 'ZONE';

@Controller('strategy')
export class StrategyController {
    constructor(
        private readonly strategyService: StrategyService,
        private readonly pickingStrategyService: PickingStrategyService,
        private readonly waveReleaseRuleService: WaveReleaseRuleService,
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
    createSession(@Body() data: { warehouseId: string; strategy: PickingStrategyType; criteria?: string; maxOrders?: number }) {
        if (data.strategy === 'WAVELESS') {
            return this.pickingStrategyService.createWavelessSession(data.warehouseId);
        }
        if (data.strategy === 'ZONE') {
            return this.pickingStrategyService.createZoneSession(data.warehouseId, data.maxOrders);
        }
        return this.pickingStrategyService.createSession(data);
    }

    @Get('picking/sessions/:id/waveless-poll')
    pollWavelessTasks(@Param('id') id: string) {
        return this.pickingStrategyService.pollWavelessTasks(id);
    }

    @Get('picking/sessions/active')
    getActiveSession(@Query('warehouseId') warehouseId: string) {
        return this.pickingStrategyService.getActiveSession(warehouseId);
    }

    // M3.3 — Picking list PDF
    @Get('picking/sessions/:id/picklist')
    async getPicklist(@Param('id') id: string, @Res() res: Response) {
        const pdf = await this.pickingStrategyService.generatePicklistPdf(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="picklist-${id.slice(0, 8)}.pdf"`);
        res.send(pdf);
    }

    @Patch('picking/tasks/:id')
    updateTask(@Param('id') id: string, @Body() data: { pickedQuantity: number; status: string; exceptionReason?: string }) {
        return this.pickingStrategyService.updateTask(id, data);
    }

    @Post('picking/tasks/:id/scan-pick')
    scanPick(@Param('id') id: string, @Body() data: { barcode: string }) {
        return this.pickingStrategyService.scanPick(id, data.barcode);
    }

    @Post('picking/sessions/:id/complete')
    completeSession(@Param('id') id: string) {
        return this.pickingStrategyService.completeSession(id);
    }

    // --- Wave Release Rules (M3.2) ---

    @Get('wave-rules')
    listWaveRules(@Query('warehouseId') warehouseId: string) {
        return this.waveReleaseRuleService.list(warehouseId);
    }

    @Post('wave-rules')
    createWaveRule(@Body() data: {
        warehouseId: string;
        name: string;
        triggerType?: string;
        cronExpression?: string;
        minOrders?: number;
        maxOrders?: number;
        enabled?: boolean;
    }) {
        return this.waveReleaseRuleService.create(data);
    }

    @Put('wave-rules/:id')
    updateWaveRule(@Param('id') id: string, @Body() data: any) {
        return this.waveReleaseRuleService.update(id, data);
    }

    @Delete('wave-rules/:id')
    deleteWaveRule(@Param('id') id: string) {
        return this.waveReleaseRuleService.remove(id);
    }

    @Post('wave-rules/:id/trigger')
    triggerWaveRule(@Param('id') id: string) {
        return this.waveReleaseRuleService.triggerRule(id);
    }
}
