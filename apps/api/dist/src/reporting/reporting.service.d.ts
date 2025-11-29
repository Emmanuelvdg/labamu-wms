import { PrismaService } from '../prisma.service';
export declare class ReportingService {
    private prisma;
    constructor(prisma: PrismaService);
    generateComplianceReport(type: string, period: string): Promise<any>;
    getDashboardAnalytics(): Promise<any>;
}
//# sourceMappingURL=reporting.service.d.ts.map