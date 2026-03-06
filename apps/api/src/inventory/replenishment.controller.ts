import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ReplenishmentService } from './replenishment.service';

@Controller('replenishment')
export class ReplenishmentController {
    constructor(private readonly replenishmentService: ReplenishmentService) { }

    @Get('summary')
    async getSummary(@Query('warehouseId') warehouseId?: string) {
        return this.replenishmentService.getSummary(warehouseId);
    }

    @Get('alerts')
    async getAlerts(
        @Query('warehouseId') warehouseId?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
    ) {
        return this.replenishmentService.getAlerts({ warehouseId, status, type });
    }

    @Post('check')
    async checkStockLevels(@Query('warehouseId') warehouseId?: string) {
        return this.replenishmentService.checkStockLevels(warehouseId);
    }

    @Post('alerts/:id/auto-po')
    async autoCreatePO(@Param('id') id: string) {
        return this.replenishmentService.autoCreatePurchaseOrder(id);
    }

    @Post('alerts/:id/dismiss')
    async dismissAlert(@Param('id') id: string) {
        return this.replenishmentService.dismissAlert(id);
    }
}
