"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ReportingService = class ReportingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateComplianceReport(type, period) {
        const reportData = {
            generatedAt: new Date(),
            type,
            period,
            totalSales: 150000000,
            totalVAT: 16500000,
            transactions: 150,
        };
        await this.prisma.complianceReport.create({
            data: {
                type,
                period,
                data: JSON.stringify(reportData),
            },
        });
        return reportData;
    }
    async getDashboardAnalytics() {
        return {
            totalStockValue: 500000000,
            lowStockItems: 5,
            pendingOrders: 12,
            dailySales: [10, 15, 8, 20, 25],
        };
    }
};
exports.ReportingService = ReportingService;
exports.ReportingService = ReportingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportingService);
//# sourceMappingURL=reporting.service.js.map