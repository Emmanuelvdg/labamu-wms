import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
    constructor(private readonly reportingService: ReportingService) { }

    @Post('compliance')
    generateReport(@Body() data: { type: string; period: string }) {
        return this.reportingService.generateComplianceReport(data.type, data.period);
    }

    @Get('analytics')
    getAnalytics() {
        return this.reportingService.getDashboardAnalytics();
    }
}
