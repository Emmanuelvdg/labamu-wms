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

    // ── Cron job: runs every minute, triggers TIME_BASED rules ───────────────

    @Cron(CronExpression.EVERY_MINUTE)
    async processTimeBasedRules() {
        const rules = await this.prisma.waveReleaseRule.findMany({
            where: { triggerType: 'TIME_BASED', enabled: true },
        });

        for (const rule of rules) {
            try {
                // Count RESERVED orders for this warehouse
                const reservedCount = await this.prisma.order.count({
                    where: {
                        OR: [{ warehouseId: rule.warehouseId }, { warehouseId: null }],
                        status: 'RESERVED',
                    },
                });

                if (reservedCount >= rule.minOrders) {
                    await this.pickingStrategy.createSession({
                        warehouseId: rule.warehouseId,
                        strategy: 'WAVE',
                        maxOrders: rule.maxOrders,
                    });
                    console.log(`[WaveRule] Released wave for warehouse ${rule.warehouseId} (rule: ${rule.name})`);
                }
            } catch (err) {
                console.error(`[WaveRule] Failed to process rule ${rule.id}:`, err);
            }
        }
    }

    // ── Manual trigger ────────────────────────────────────────────────────────

    async triggerRule(id: string) {
        const rule = await this.findOrFail(id);
        await this.pickingStrategy.createSession({
            warehouseId: rule.warehouseId,
            strategy: 'WAVE',
            maxOrders: rule.maxOrders,
        });
        return { success: true, message: `Wave released for warehouse ${rule.warehouseId}` };
    }

    private async findOrFail(id: string) {
        const rule = await this.prisma.waveReleaseRule.findUnique({ where: { id } });
        if (!rule) throw new NotFoundException(`WaveReleaseRule ${id} not found`);
        return rule;
    }
}
