import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { ReportingService } from './reporting.service';

@Controller('reporting')
@UseGuards(PermissionsGuard)
export class ReportingController {
    constructor(private readonly reportingService: ReportingService) { }

    @Post('compliance')
    @RequirePermission('REPORTS', 'CREATE')
    generateReport(@Body() data: { type: string; period: string }) {
        return this.reportingService.generateComplianceReport(data.type, data.period);
    }

    @Get('analytics')
    @RequirePermission('REPORTS', 'READ')
    getAnalytics() {
        return this.reportingService.getDashboardAnalytics();
    }
}
