import { Controller, Get, Param, Query } from '@nestjs/common';
import { PickAccuracyService } from './pick-accuracy.service';
import { CycleCountService } from './cycle-count.service';

@Controller('reporting')
export class ReportingController {
    constructor(
        private readonly pickAccuracyService: PickAccuracyService,
        private readonly cycleCountService: CycleCountService
    ) { }

    @Get('pick-accuracy/:warehouseId')
    async getPickAccuracy(
        @Param('warehouseId') warehouseId: string,
        @Query('periodDays') periodDays?: string
    ) {
        return this.pickAccuracyService.getPickAccuracyMetrics(
            warehouseId,
            periodDays ? parseInt(periodDays) : 30
        );
    }

    @Get('cycle-count/:warehouseId')
    async getZoneCycleCount(
        @Param('warehouseId') warehouseId: string,
        @Query('zone') zone: string
    ) {
        return this.cycleCountService.generateZoneCycleCount(warehouseId, zone);
    }
}
