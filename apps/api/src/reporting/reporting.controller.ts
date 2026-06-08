import { Controller, Get, Post, Body, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { FeatureFlagGuard, RequireFlag } from '../common/guards/feature-flag.guard';
import { ReportingService } from './reporting.service';
import { DrillDownService } from './drilldown.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLedgerQueryDto } from './inventory-ledger-query.dto';
import { ExcelService } from '../common/excel/excel.service';
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

    @IsOptional()
    warehouseId?: string;

    @IsOptional()
    locationId?: string;
}

@Controller('reporting')
@UseGuards(PermissionsGuard)
export class ReportingController {
    constructor(
        private readonly reportingService: ReportingService,
        private readonly drillDownService: DrillDownService,
        private readonly inventoryLedgerService: InventoryLedgerService,
        private readonly excelService: ExcelService,
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

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('utilisation/history')
    @RequirePermission('REPORTS', 'READ')
    getUtilisationHistory(@Query() query: AnalyticsQueryDto) {
        return this.reportingService.getUtilisationHistory(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('cycle-time/trend')
    @RequirePermission('REPORTS', 'READ')
    getCycleTimeTrend(@Query() query: AnalyticsQueryDto) {
        return this.reportingService.getCycleTimeTrend(query);
    }

    // Drill-down endpoints — require ADVANCED_ANALYTICS
    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/stock-value')
    @RequirePermission('REPORTS', 'READ')
    getStockValueDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getStockValueDetails(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/fulfillment')
    @RequirePermission('REPORTS', 'READ')
    getFulfillmentDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getFulfillmentDetails(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/stockout')
    @RequirePermission('REPORTS', 'READ')
    getStockoutDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getStockoutDetails(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/pending-orders')
    @RequirePermission('REPORTS', 'READ')
    getPendingOrderDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getPendingOrderDetails(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/cycle-time')
    @RequirePermission('REPORTS', 'READ')
    getCycleTimeDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getCycleTimeDetails(query);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('analytics/drilldown/capacity')
    @RequirePermission('REPORTS', 'READ')
    getCapacityDetails(@Query() query: AnalyticsQueryDto) {
        return this.drillDownService.getCapacityDetails(query);
    }

    // Inventory ledger endpoint
    @UseGuards(FeatureFlagGuard)
    @RequireFlag('ADVANCED_ANALYTICS')
    @Get('inventory-ledger')
    @RequirePermission('REPORTS', 'READ')
    async getInventoryLedger(@Query() query: InventoryLedgerQueryDto, @Res({ passthrough: true }) res: Response) {
        if (query.format === 'xlsx') {
            const jsonResult = await this.inventoryLedgerService.getLedgerEntries({ ...query, format: undefined } as any) as any;
            const rows = (jsonResult.data ?? []).map((e: any) => ({
                date: e.date ? new Date(e.date).toLocaleString() : '',
                type: e.type,
                productSku: e.productSku ?? '',
                productName: e.productName ?? '',
                quantity: e.quantity,
                warehouseName: e.warehouseName ?? '',
                locationName: e.locationName ?? '',
                orderIds: Array.isArray(e.orderIds) ? e.orderIds.filter(Boolean).join('; ') : '',
                notes: e.notes ?? '',
            }));
            const buffer = await this.excelService.buildBuffer('Inventory Ledger', [
                { header: 'Date',         key: 'date',         width: 22 },
                { header: 'Type',         key: 'type',         width: 14 },
                { header: 'Product SKU',  key: 'productSku',   width: 16 },
                { header: 'Product Name', key: 'productName',  width: 28 },
                { header: 'Quantity',     key: 'quantity',     width: 12 },
                { header: 'Warehouse',    key: 'warehouseName',width: 20 },
                { header: 'Location',     key: 'locationName', width: 20 },
                { header: 'Order IDs',    key: 'orderIds',     width: 24 },
                { header: 'Notes',        key: 'notes',        width: 30 },
            ], rows);
            res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="inventory-ledger.xlsx"', 'Content-Length': buffer.length });
            res.end(buffer);
            return;
        }

        const result = await this.inventoryLedgerService.getLedgerEntries(query);
        if (typeof result === 'string') {
            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename="inventory-ledger.csv"');
        }
        return result;
    }
}
