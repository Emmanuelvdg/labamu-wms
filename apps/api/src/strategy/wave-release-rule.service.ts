import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { PickingStrategyService } from './picking-strategy.service';

@Injectable()
export class WaveReleaseRuleService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pickingStrategy: PickingStrategyService,
    ) {}

    // ── CRUD ─────────────────────────────────────────────────────────────────

    async list(warehouseId: string) {
        return this.prisma.waveReleaseRule.findMany({
            where: { warehouseId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(data: {
        warehouseId: string;
        name: string;
        triggerType?: string;
        cronExpression?: string;
        minOrders?: number;
        maxOrders?: number;
        enabled?: boolean;
    }) {
        return this.prisma.waveReleaseRule.create({ data });
    }

    async update(id: string, data: {
        name?: string;
        triggerType?: string;
        cronExpression?: string;
        minOrders?: number;
        maxOrders?: number;
        enabled?: boolean;
    }) {
        await this.findOrFail(id);
        return this.prisma.waveReleaseRule.update({ where: { id }, data });
    }

    async remove(id: string) {
        await this.findOrFail(id);
        await this.prisma.waveReleaseRule.delete({ where: { id } });
        return { success: true };
    }

    // ── Cron job: runs every minute, evaluates all auto-trigger rules ─────────

    @Cron(CronExpression.EVERY_MINUTE)
    async processAutoRules() {
        const rules = await this.prisma.waveReleaseRule.findMany({
            where: { triggerType: { in: ['TIME_BASED', 'ORDER_COUNT'] }, enabled: true },
        });

        for (const rule of rules) {
            try {
                const reservedCount = await this.prisma.order.count({
                    where: {
                        OR: [{ warehouseId: rule.warehouseId }, { warehouseId: null }],
                        status: 'RESERVED',
                    },
                });

                const shouldRelease =
                    rule.triggerType === 'ORDER_COUNT'
                        ? reservedCount >= rule.minOrders          // release as soon as threshold met
                        : reservedCount >= rule.minOrders;         // TIME_BASED: cron fires, check threshold

                if (shouldRelease) {
                    await this.pickingStrategy.createSession({
                        warehouseId: rule.warehouseId,
                        strategy: 'WAVE',
                        maxOrders: rule.maxOrders,
                    });
                    console.log(`[WaveRule] ${rule.triggerType} wave released — warehouse ${rule.warehouseId}, rule "${rule.name}", orders: ${reservedCount}`);
                }
            } catch (err) {
                console.error(`[WaveRule] Failed to process rule ${rule.id}:`, err);
            }
        }
    }

    // ── Manual trigger ────────────────────────────────────────────────────────

    async triggerRule(id: string) {
        const rule = await this.findOrFail(id);

        const reservedCount = await this.prisma.order.count({
            where: {
                OR: [{ warehouseId: rule.warehouseId }, { warehouseId: null }],
                status: 'RESERVED',
            },
        });

        if (reservedCount === 0) {
            return { success: false, message: 'No RESERVED orders available to wave-release' };
        }

        const session = await this.pickingStrategy.createSession({
            warehouseId: rule.warehouseId,
            strategy: 'WAVE',
            maxOrders: rule.maxOrders,
        });

        return {
            success: true,
            message: `Wave released for warehouse ${rule.warehouseId}`,
            sessionId: (session as any)?.id,
            ordersIncluded: reservedCount,
        };
    }

    private async findOrFail(id: string) {
        const rule = await this.prisma.waveReleaseRule.findUnique({ where: { id } });
        if (!rule) throw new NotFoundException(`WaveReleaseRule ${id} not found`);
        return rule;
    }
}
