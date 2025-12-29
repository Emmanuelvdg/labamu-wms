import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportingService {
    constructor(private prisma: PrismaService) { }

    async generateComplianceReport(type: string, period: string): Promise<any> {
        const startOfMonth = new Date(`${period}-01`);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

        if (type === 'VAT') {
            // VAT Report: Based on Shipped Orders (Sales)
            // Note: Using Average Cost as proxy for Value since Price is missing
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

            const totalVAT = totalSalesBase * 0.11; // 11%

            const reportData = {
                generatedAt: new Date(),
                type,
                period,
                totalSalesBase, // Cost Basis
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
        } else if (type === 'SAF-T') {
            // SAF-T: Standard Audit File for Tax - Basic Transaction List
            // Gathering Stock Transactions for the period
            const transactions = await this.prisma.stockTransaction.findMany({
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                include: { product: true },
                take: 100 // Cap for demo
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

    async getDashboardAnalytics(query?: any): Promise<any> {
        const { startDate, endDate } = this.parseDateRange(query);
        // 1. Inventory Value
        const products = await this.prisma.product.findMany({
            include: { inventory: true }
        });

        let totalStockValue = 0;
        let activeProducts = 0;
        let outOfStockProducts = 0;
        const categoryValue: Record<string, number> = {};

        for (const product of products) {
            if (product.status === 'Active') {
                activeProducts++;
                const totalQty = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

                if (totalQty <= 0) {
                    outOfStockProducts++;
                }

                const value = totalQty * product.averageCost;
                totalStockValue += value;

                // Category Breakdown
                const cat = product.category || 'Uncategorized';
                categoryValue[cat] = (categoryValue[cat] || 0) + value;
            }
        }

        const stockoutRate = activeProducts > 0 ? (outOfStockProducts / activeProducts) * 100 : 0;

        // 2. Order Fulfillment Rate (filtered by date range)
        const totalOrders = await this.prisma.order.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        const shippedOrders = await this.prisma.order.count({
            where: {
                status: 'SHIPPED',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        const fulfillmentRate = totalOrders > 0 ? (shippedOrders / totalOrders) * 100 : 0;

        // 3. Pending Orders (filtered by date range)
        const pendingOrders = await this.prisma.order.count({
            where: {
                status: { in: ['PENDING', 'RESERVED', 'PICKING'] },
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // 4. Order Cycle Time (Avg hours from Created to Shipped, filtered by date range)
        const shippedOrdersList = await this.prisma.order.findMany({
            where: {
                status: 'SHIPPED',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
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

        // 5. Daily Sales Trend (Last 5 Days - Order Count)
        const dailySalesData: { date: string; count: number }[] = [];
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

            // Format date as DD/MM
            const dateLabel = `${d.getDate().toString().padStart(2, '0')} / ${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            dailySalesData.push({ date: dateLabel, count: dailyCount });
        }
        const dailySales = dailySalesData;

        // 6. Storage Capacity (Volume in m3)
        const locations = await this.prisma.location.findMany({
            where: { maxVolume: { not: null } },
            include: { inventory: { include: { product: true } } }
        });

        let totalCapacity = 0;
        let usedCapacity = 0;

        for (const loc of locations) {
            if (loc.maxVolume) {
                totalCapacity += loc.maxVolume;

                // Calculate used volume
                for (const inv of loc.inventory) {
                    const p = inv.product;
                    if (p.width && p.height && p.depth) {
                        // cm3 to m3
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
            meta: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                period: query?.period || '7d'
            }
        };
    }

    private parseDateRange(query?: any): { startDate: Date, endDate: Date } {
        const endDate = new Date();
        let startDate: Date;

        if (query?.period === 'custom' && query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate.setTime(new Date(query.endDate).getTime());
        } else {
            const days = query?.period === '30d' ? 30 : query?.period === '90d' ? 90 : 7;
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        return { startDate, endDate };
    }



