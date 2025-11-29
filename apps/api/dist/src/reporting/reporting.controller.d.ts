import { ReportingService } from './reporting.service';
export declare class ReportingController {
    private readonly reportingService;
    constructor(reportingService: ReportingService);
    generateReport(data: {
        type: string;
        period: string;
    }): Promise<any>;
    getAnalytics(): Promise<any>;
}
//# sourceMappingURL=reporting.controller.d.ts.map