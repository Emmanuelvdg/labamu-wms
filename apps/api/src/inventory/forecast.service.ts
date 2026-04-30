import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FeatureFlagService } from '../company/feature-flag.service';

const ALPHA = 0.3; // level smoothing
const BETA = 0.1;  // trend smoothing
const FORECAST_HORIZON = 30; // days
const MIN_HISTORY_DAYS = 7;  // minimum for meaningful forecast
const REQUIRED_HISTORY_DAYS = 90;

@Injectable()
export class ForecastService {
    private readonly logger = new Logger(ForecastService.name);

    constructor(private prisma: PrismaService, private featureFlags: FeatureFlagService) { }

    // M8.1 — Aggregate yesterday's PICK/SALE transactions into DailySalesSummary
    @Cron('0 1 * * *')
    async aggregateDailySales() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const transactions = await this.prisma.stockTransaction.findMany({
            where: { type: { in: ['PICK', 'SALE', 'OUT'] }, date: { gte: yesterday, lte: endOfYesterday } },
            include: { product: true },
        });

        const grouped: Record<string, { companyId: string; productId: string; warehouseId: string; unitsSold: number; revenue: number }> = {};
        for (const tx of transactions) {
            const warehouseId = 'global';
            const key = `${tx.product.companyId ?? 'global'}_${tx.productId}_${warehouseId}`;
            if (!grouped[key]) {
                grouped[key] = { companyId: tx.product.companyId ?? 'global', productId: tx.productId, warehouseId, unitsSold: 0, revenue: 0 };
            }
            grouped[key].unitsSold += Math.abs(tx.quantity);
            grouped[key].revenue += Math.abs(tx.quantity) * (tx.product.averageCost ?? 0);
        }

        for (const entry of Object.values(grouped)) {
            await this.prisma.dailySalesSummary.upsert({
                where: { companyId_productId_warehouseId_date: { companyId: entry.companyId, productId: entry.productId, warehouseId: entry.warehouseId, date: yesterday } },
                create: { ...entry, date: yesterday },
                update: { unitsSold: entry.unitsSold, revenue: entry.revenue },
            });
        }

        this.logger.log(`Daily sales aggregation complete: ${Object.keys(grouped).length} series updated`);
    }

    // M8.2 — Nightly forecast run
    @Cron('0 2 * * *')
    async runNightlyForecasts() {
        const companies = await this.prisma.company.findMany({ select: { id: true } });
        for (const company of companies) {
            const flags = await this.featureFlags.getFlagsForCompany(company.id);
            if (!flags.find((f: any) => f.key === 'AI_REORDER' && f.enabled)) continue;
            await this.runForecastsForCompany(company.id).catch(e => this.logger.error(`Forecast failed for company ${company.id}: ${e.message}`));
        }
    }

    async runForecastsForCompany(companyId: string): Promise<{ forecasted: number; skipped: number }> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - REQUIRED_HISTORY_DAYS);

        const series = await this.prisma.dailySalesSummary.groupBy({
            by: ['productId', 'warehouseId'],
            where: { companyId },
            _count: { date: true },
        });

        let forecasted = 0;
        let skipped = 0;

        for (const s of series) {
            if (s._count.date < MIN_HISTORY_DAYS) { skipped++; continue; }

            const history = await this.prisma.dailySalesSummary.findMany({
                where: { companyId, productId: s.productId, warehouseId: s.warehouseId },
                orderBy: { date: 'asc' },
                select: { date: true, unitsSold: true },
            });

            const values = history.map(h => h.unitsSold);
            const { level, trend } = this.doubleExponentialSmoothing(values);
            const confidence = Math.min(1, history.length / REQUIRED_HISTORY_DAYS);

            // Apply seasonality multiplier if configured
            const profiles = await this.prisma.seasonalityProfile.findMany({
                where: { companyId },
                include: { periods: true },
            });

            for (let h = 1; h <= FORECAST_HORIZON; h++) {
                const forecastDate = new Date();
                forecastDate.setDate(forecastDate.getDate() + h);
                forecastDate.setHours(0, 0, 0, 0);

                let predicted = Math.max(0, level + h * trend);
                const multiplier = this.getSeasonalityMultiplier(forecastDate, profiles);
                predicted *= multiplier;

                await this.prisma.salesForecast.upsert({
                    where: { companyId_productId_warehouseId_forecastDate: { companyId, productId: s.productId, warehouseId: s.warehouseId, forecastDate } },
                    create: { companyId, productId: s.productId, warehouseId: s.warehouseId, forecastDate, predictedQty: predicted, confidence, method: 'EXPONENTIAL_SMOOTHING' },
                    update: { predictedQty: predicted, confidence, generatedAt: new Date() },
                });
            }
            forecasted++;
        }

        return { forecasted, skipped };
    }

    private doubleExponentialSmoothing(values: number[]): { level: number; trend: number } {
        if (values.length === 0) return { level: 0, trend: 0 };
        if (values.length === 1) return { level: values[0], trend: 0 };

        let L = values[0];
        let T = values[1] - values[0];

        for (let i = 1; i < values.length; i++) {
            const prevL = L;
            L = ALPHA * values[i] + (1 - ALPHA) * (L + T);
            T = BETA * (L - prevL) + (1 - BETA) * T;
        }

        return { level: L, trend: T };
    }

    private getSeasonalityMultiplier(date: Date, profiles: any[]): number {
        const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        for (const profile of profiles) {
            for (const period of profile.periods) {
                if (md >= period.startMD && md <= period.endMD) return period.multiplier;
            }
        }
        return 1;
    }

    async getForecastForProduct(companyId: string, productId: string, warehouseId?: string) {
        return this.prisma.salesForecast.findMany({
            where: {
                companyId,
                productId,
                ...(warehouseId ? { warehouseId } : {}),
                forecastDate: { gte: new Date() },
            },
            orderBy: { forecastDate: 'asc' },
            take: 30,
        });
    }

    // M8.5 — Compute accuracy for yesterday's forecasts
    @Cron('0 3 * * *')
    async computeForecastAccuracy() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const forecasts = await this.prisma.salesForecast.findMany({
            where: { forecastDate: yesterday, accuracy: null },
        });

        for (const forecast of forecasts) {
            const actual = await this.prisma.dailySalesSummary.findUnique({
                where: { companyId_productId_warehouseId_date: { companyId: forecast.companyId, productId: forecast.productId, warehouseId: forecast.warehouseId, date: yesterday } },
            });
            if (!actual) continue;

            const mae = Math.abs(forecast.predictedQty - actual.unitsSold);
            const mape = actual.unitsSold > 0 ? mae / actual.unitsSold : 0;

            await this.prisma.forecastAccuracy.create({
                data: { forecastId: forecast.id, actualQty: actual.unitsSold, mae, mape },
            });
        }
    }

    async getAccuracy(companyId: string) {
        const since = new Date();
        since.setDate(since.getDate() - 30);

        return this.prisma.salesForecast.findMany({
            where: { companyId, forecastDate: { gte: since }, accuracy: { isNot: null } },
            include: { accuracy: true },
            orderBy: { forecastDate: 'desc' },
        });
    }

    async getDataReadiness(companyId: string): Promise<{ days: number; ready: boolean }> {
        const oldest = await this.prisma.dailySalesSummary.findFirst({
            where: { companyId },
            orderBy: { date: 'asc' },
            select: { date: true },
        });
        if (!oldest) return { days: 0, ready: false };

        const days = Math.floor((Date.now() - oldest.date.getTime()) / (1000 * 60 * 60 * 24));
        return { days: Math.min(days, REQUIRED_HISTORY_DAYS), ready: days >= REQUIRED_HISTORY_DAYS };
    }
}
