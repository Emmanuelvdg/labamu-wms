import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CurrencyService {
    constructor(private readonly prisma: PrismaService) {}

    // ── Currency CRUD ─────────────────────────────────────────────────────────

    async listCurrencies() {
        return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
    }

    async createCurrency(data: { code: string; name: string; symbol: string; isBase?: boolean; enabled?: boolean }) {
        if (data.isBase) {
            // Only one base currency allowed — unset any existing base
            await this.prisma.currency.updateMany({ data: { isBase: false } });
        }
        return this.prisma.currency.create({ data });
    }

    async updateCurrency(code: string, data: { name?: string; symbol?: string; isBase?: boolean; enabled?: boolean }) {
        await this.findCurrencyOrFail(code);
        if (data.isBase) {
            await this.prisma.currency.updateMany({ data: { isBase: false } });
        }
        return this.prisma.currency.update({ where: { code }, data });
    }

    async deleteCurrency(code: string) {
        await this.findCurrencyOrFail(code);
        await this.prisma.currency.delete({ where: { code } });
        return { success: true };
    }

    // ── Exchange Rate CRUD ────────────────────────────────────────────────────

    async listRates() {
        return this.prisma.exchangeRate.findMany({ orderBy: [{ fromCode: 'asc' }, { toCode: 'asc' }] });
    }

    async setRate(fromCode: string, toCode: string, rate: number, source = 'MANUAL') {
        if (fromCode === toCode) throw new BadRequestException('fromCode and toCode must differ');
        return this.prisma.exchangeRate.upsert({
            where: { fromCode_toCode: { fromCode, toCode } },
            create: { fromCode, toCode, rate, source, fetchedAt: new Date() },
            update: { rate, source, fetchedAt: new Date() },
        });
    }

    // ── Convert amount between currencies ─────────────────────────────────────

    async convert(amount: number, fromCode: string, toCode: string): Promise<number> {
        if (fromCode === toCode) return amount;
        const rate = await this.prisma.exchangeRate.findUnique({
            where: { fromCode_toCode: { fromCode, toCode } },
        });
        if (!rate) {
            // Try inverse rate
            const inverse = await this.prisma.exchangeRate.findUnique({
                where: { fromCode_toCode: { fromCode: toCode, toCode: fromCode } },
            });
            if (inverse) return amount / inverse.rate;
            return amount; // No rate found — return as-is
        }
        return amount * rate.rate;
    }

    // ── M6.5 — FX provider scheduled sync (daily at midnight) ─────────────────
    // Uses exchangerate.host (free, no key required)

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async syncFxRates() {
        try {
            const base = await this.prisma.currency.findFirst({ where: { isBase: true } });
            if (!base) return;

            const currencies = await this.prisma.currency.findMany({ where: { enabled: true, isBase: false } });
            if (currencies.length === 0) return;

            const symbols = currencies.map(c => c.code).join(',');
            const url = `https://api.exchangerate.host/latest?base=${base.code}&symbols=${symbols}`;

            const res = await fetch(url).catch(() => null);
            if (!res?.ok) {
                console.warn('[FX Sync] Failed to fetch rates from exchangerate.host');
                return;
            }

            const data = await res.json();
            const rates: Record<string, number> = data?.rates ?? {};

            for (const [toCode, rate] of Object.entries(rates)) {
                if (typeof rate === 'number' && rate > 0) {
                    await this.setRate(base.code, toCode, rate, 'OPENEXCHANGE');
                }
            }

            console.log(`[FX Sync] Updated ${Object.keys(rates).length} rates from exchangerate.host`);
        } catch (err) {
            console.error('[FX Sync] Error during sync:', err);
        }
    }

    async triggerSync() {
        await this.syncFxRates();
        return { success: true, message: 'FX rates sync triggered' };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async findCurrencyOrFail(code: string) {
        const c = await this.prisma.currency.findUnique({ where: { code } });
        if (!c) throw new NotFoundException(`Currency ${code} not found`);
        return c;
    }
}
