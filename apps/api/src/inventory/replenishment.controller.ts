import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ReplenishmentService } from './replenishment.service';
import { ForecastService } from './forecast.service';
import { PrismaService } from '../prisma.service';

@Controller('replenishment')
export class ReplenishmentController {
    constructor(
        private readonly replenishmentService: ReplenishmentService,
        private readonly forecastService: ForecastService,
        private readonly prisma: PrismaService,
    ) { }

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
    async checkStockLevels(@Query('warehouseId') warehouseId?: string, @Query('companyId') companyId?: string) {
        return this.replenishmentService.checkStockLevels(warehouseId, companyId);
    }

    @Post('alerts/:id/auto-po')
    async autoCreatePO(@Param('id') id: string) {
        return this.replenishmentService.autoCreatePurchaseOrder(id);
    }

    @Post('alerts/:id/dismiss')
    async dismissAlert(@Param('id') id: string) {
        return this.replenishmentService.dismissAlert(id);
    }

    @Post('forecast/run')
    async runForecast(@Body() body: { companyId: string }) {
        return this.forecastService.runForecastsForCompany(body.companyId);
    }

    @Get('forecast/:productId')
    async getForecast(
        @Param('productId') productId: string,
        @Query('companyId') companyId: string,
        @Query('warehouseId') warehouseId?: string,
    ) {
        return this.forecastService.getForecastForProduct(companyId, productId, warehouseId);
    }

    @Get('forecast/accuracy')
    async getAccuracy(@Query('companyId') companyId: string) {
        return this.forecastService.getAccuracy(companyId);
    }

    @Get('forecast/readiness')
    async getDataReadiness(@Req() req: any, @Query('companyId') companyId?: string) {
        return this.forecastService.getDataReadiness(companyId ?? req.user?.companyId);
    }

    // M8.4 — Seasonality profiles CRUD
    @Get('seasonality')
    async listSeasonalityProfiles(@Req() req: any, @Query('companyId') companyId?: string) {
        const cId = companyId ?? req.user?.companyId;
        return this.prisma.seasonalityProfile.findMany({ where: { companyId: cId }, include: { periods: true } });
    }

    @Post('seasonality')
    async createSeasonalityProfile(@Req() req: any, @Body() body: { companyId?: string; name: string }) {
        const companyId = body.companyId ?? req.user?.companyId;
        return this.prisma.seasonalityProfile.create({ data: { name: body.name, companyId } });
    }

    @Post('seasonality/:id/periods')
    async addPeriod(@Param('id') profileId: string, @Body() body: { label: string; startMD: string; endMD: string; multiplier: number }) {
        return this.prisma.seasonalityPeriod.create({ data: { profileId, ...body } });
    }

    @Post('seasonality/periods/:id')
    async deletePeriod(@Param('id') id: string) {
        return this.prisma.seasonalityPeriod.delete({ where: { id } });
    }
}
