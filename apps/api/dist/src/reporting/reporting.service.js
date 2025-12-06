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
        const startOfMonth = new Date(`${period}-01`);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
        if (type === 'VAT') {
            const shippedOrders = await this.prisma.order.findMany({
                where: {
                    status: 'SHIPPED',
                    updatedAt: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            });
            let totalSalesBase = 0;
            let transactionCount = 0;
            for (const order of shippedOrders) {
                transactionCount++;
                for (const item of order.items) {
                    totalSalesBase += (item.quantity * item.product.averageCost);
                }
            }
            const totalVAT = totalSalesBase * 0.11;
            const reportData = {
                generatedAt: new Date(),
                type,
                period,
                totalSalesBase,
                totalVAT,
                transactionCount,
                currency: 'IDR'
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
        else if (type === 'SAF-T') {
            const transactions = await this.prisma.stockTransaction.findMany({
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                include: { product: true },
                take: 100
            });
            const formattedTransactions = transactions.map(t => ({
                id: t.id,
                date: t.date,
                type: t.type,
                product: t.product.name,
                sku: t.product.sku,
                quantity: t.quantity,
                value: t.quantity * t.product.averageCost
            }));
            const reportData = {
                header: {
                    companyName: "Labamu IMS",
                    dateCreated: new Date(),
                    period
                },
                transactions: formattedTransactions
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
        return null;
    }
    async getDashboardAnalytics() {
        const products = await this.prisma.product.findMany({
            include: { inventory: true }
        });
        let totalStockValue = 0;
        let activeProducts = 0;
        let outOfStockProducts = 0;
        const categoryValue = {};
        for (const product of products) {
            if (product.status === 'Active') {
                activeProducts++;
                const totalQty = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
                if (totalQty <= 0) {
                    outOfStockProducts++;
                }
                const value = totalQty * product.averageCost;
                totalStockValue += value;
                const cat = product.category || 'Uncategorized';
                categoryValue[cat] = (categoryValue[cat] || 0) + value;
            }
        }
        const stockoutRate = activeProducts > 0 ? (outOfStockProducts / activeProducts) * 100 : 0;
        const totalOrders = await this.prisma.order.count();
        const shippedOrders = await this.prisma.order.count({
            where: { status: 'SHIPPED' }
        });
        const fulfillmentRate = totalOrders > 0 ? (shippedOrders / totalOrders) * 100 : 0;
        const pendingOrders = await this.prisma.order.count({
            where: { status: { in: ['PENDING', 'RESERVED', 'PICKING'] } }
        });
        const shippedOrdersList = await this.prisma.order.findMany({
            where: { status: 'SHIPPED' },
            select: { createdAt: true, updatedAt: true }
        });
        let totalCycleTimeHours = 0;
        if (shippedOrdersList.length > 0) {
            totalCycleTimeHours = shippedOrdersList.reduce((sum, order) => {
                const created = new Date(order.createdAt).getTime();
                const shipped = new Date(order.updatedAt).getTime();
                return sum + ((shipped - created) / (1000 * 60 * 60));
            }, 0);
        }
        const avgCycleTime = shippedOrdersList.length > 0 ? (totalCycleTimeHours / shippedOrdersList.length).toFixed(1) : 0;
        const dailySalesData = [];
        const today = new Date();
        for (let i = 4; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const startOfDay = new Date(d.setHours(0, 0, 0, 0));
            const endOfDay = new Date(d.setHours(23, 59, 59, 999));
            const dailyCount = await this.prisma.order.count({
                where: {
                    status: 'SHIPPED',
                    updatedAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });
            const dateLabel = `${d.getDate().toString().padStart(2, '0')} / ${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            dailySalesData.push({ date: dateLabel, count: dailyCount });
        }
        const dailySales = dailySalesData;
        const locations = await this.prisma.location.findMany({
            where: { maxVolume: { not: null } },
            include: { inventory: { include: { product: true } } }
        });
        let totalCapacity = 0;
        let usedCapacity = 0;
        for (const loc of locations) {
            if (loc.maxVolume) {
                totalCapacity += loc.maxVolume;
                for (const inv of loc.inventory) {
                    const p = inv.product;
                    if (p.width && p.height && p.depth) {
                        const volumePerUnit = (p.width * p.height * p.depth) / 1000000;
                        usedCapacity += volumePerUnit * inv.quantity;
                    }
                }
            }
        }
        const capacityUtilization = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;
        return {
            totalStockValue,
            fulfillmentRate: parseFloat(fulfillmentRate.toFixed(1)),
            stockoutRate: parseFloat(stockoutRate.toFixed(1)),
            pendingOrders,
            avgCycleTime,
            capacityUtilization: parseFloat(capacityUtilization.toFixed(1)),
            categoryValue,
            dailySales,
        };
    }
};
exports.ReportingService = ReportingService;
exports.ReportingService = ReportingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportingService);
//# sourceMappingURL=reporting.service.js.map