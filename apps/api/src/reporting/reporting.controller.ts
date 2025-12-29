import { Controller, Get, Post, Body, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { ReportingService } from './reporting.service';
import { DrillDownService } from './drilldown.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLedgerQueryDto } from './inventory-ledger-query.dto';
import { IsOptional, IsEnum, IsISO8601 } from 'class-validator';

export class AnalyticsQueryDto {
    @IsOptional()
    @IsEnum(['7d', '30d', '90d', 'custom'])
    period?: string;

    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;
}

@Controller('reporting')
@UseGuards(PermissionsGuard)
export class ReportingController {
    constructor(
        private readonly reportingService: ReportingService,
        private readonly drillDownService: DrillDownService,
        private readonly inventoryLedgerService: InventoryLedgerService,
    ) { }

    @Post('compliance')
    @RequirePermission('REPORTS', 'CREATE')
    generateReport(@Body() data: { type: string; period: string }) {
        return this.reportingService.generateComplianceReport(data.type, data.period);
    }

    @Get('analytics')
    @RequirePermission('REPORTS', 'READ')
    getAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.reportingService.getDashboardAnalytics(query);
    }

    // Drill-down endpoints for detailed metric data
    @Get('analytics/drilldown/stock-value')
    @RequirePermission('REPORTS', 'READ')
    getStockValueDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getStockValueDetails(query);
    }

    @Get('analytics/drilldown/fulfillment')
    @RequirePermission('REPORTS', 'READ')
    getFulfillmentDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getFulfillmentDetails(query);
    }

    @Get('analytics/drilldown/stockout')
    @RequirePermission('REPORTS', 'READ')
    getStockoutDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getStockoutDetails(query);
    }

    @Get('analytics/drilldown/pending-orders')
    @RequirePermission('REPORTS', 'READ')
    getPendingOrderDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getPendingOrderDetails(query);
    }

    @Get('analytics/drilldown/cycle-time')
    @RequirePermission('REPORTS', 'READ')
    getCycleTimeDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getCycleTimeDetails(query);
    }

    @Get('analytics/drilldown/capacity')
    @RequirePermission('REPORTS', 'READ')
    getCapacityDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getCapacityDetails(query);
    }

    // Inventory ledger endpoint
    @Get('inventory-ledger')
    @RequirePermission('REPORTS', 'READ')
    async getInventoryLedger(@Query() query: InventoryLedgerQueryDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.inventoryLedgerService.getLedgerEntries(query);
        if (typeof result === 'string') {
            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename="inventory-ledger.csv"');
        }
        return result;
    }
}
