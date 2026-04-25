import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { runWithoutTenant } from '../common/tenant/tenant-storage';

export interface UpsertPlanDto {
    billingCycle?: string;
    trialEndsAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    maxUsers?: number | null;
    maxWarehouses?: number | null;
    maxProducts?: number | null;
    maxOrders?: number | null;
    notes?: string | null;
}

// Default quotas keyed by plan name (null = unlimited)
const PLAN_DEFAULTS: Record<string, { maxUsers: number | null; maxWarehouses: number | null; maxProducts: number | null; maxOrders: number | null }> = {
    FREE:         { maxUsers: 3,    maxWarehouses: 1,    maxProducts: 100,  maxOrders: 50   },
    STARTER:      { maxUsers: 10,   maxWarehouses: 3,    maxProducts: 1000, maxOrders: 500  },
    PROFESSIONAL: { maxUsers: 50,   maxWarehouses: 10,   maxProducts: 5000, maxOrders: null },
    ENTERPRISE:   { maxUsers: null, maxWarehouses: null, maxProducts: null, maxOrders: null },
};

@Injectable()
export class PlanService {
    constructor(private prisma: PrismaService) {}

    async getPlan(companyId: string) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id: companyId }, select: { plan: true } });
            if (!company) throw new NotFoundException('Company not found');

            let plan = await (this.prisma as any).tenantPlan.findUnique({ where: { companyId } });
            if (!plan) {
                plan = await (this.prisma as any).tenantPlan.create({ data: { companyId } });
            }
            return { ...plan, planDefaults: PLAN_DEFAULTS[company.plan] ?? PLAN_DEFAULTS.STARTER };
        });
    }

    async upsertPlan(companyId: string, dto: UpsertPlanDto) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id: companyId } });
            if (!company) throw new NotFoundException('Company not found');

            return (this.prisma as any).tenantPlan.upsert({
                where: { companyId },
                create: { companyId, ...this.sanitize(dto) },
                update: this.sanitize(dto),
            });
        });
    }

    async getLimits(companyId: string) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id: companyId }, select: { plan: true } });
            if (!company) throw new NotFoundException('Company not found');

            const plan = await (this.prisma as any).tenantPlan.findUnique({ where: { companyId } });
            const defaults = PLAN_DEFAULTS[company.plan] ?? PLAN_DEFAULTS.STARTER;

            const effective = {
                maxUsers:      plan?.maxUsers      ?? defaults.maxUsers,
                maxWarehouses: plan?.maxWarehouses ?? defaults.maxWarehouses,
                maxProducts:   plan?.maxProducts   ?? defaults.maxProducts,
                maxOrders:     plan?.maxOrders     ?? defaults.maxOrders,
            };

            const [userCount, warehouseCount, productCount, orderCount] = await Promise.all([
                this.prisma.user.count({ where: { companyId } }),
                this.prisma.warehouse.count({ where: { companyId } }),
                this.prisma.product.count({ where: { companyId } }),
                this.prisma.order.count({ where: { warehouse: { companyId } } }),
            ]);

            const usage = { userCount, warehouseCount, productCount, orderCount };

            return { effective, usage, plan: company.plan };
        });
    }

    private sanitize(dto: UpsertPlanDto) {
        const out: any = {};
        if (dto.billingCycle !== undefined) out.billingCycle = dto.billingCycle;
        if (dto.trialEndsAt !== undefined) out.trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
        if (dto.currentPeriodStart !== undefined) out.currentPeriodStart = dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : null;
        if (dto.currentPeriodEnd !== undefined) out.currentPeriodEnd = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null;
        if (dto.maxUsers !== undefined) out.maxUsers = dto.maxUsers;
        if (dto.maxWarehouses !== undefined) out.maxWarehouses = dto.maxWarehouses;
        if (dto.maxProducts !== undefined) out.maxProducts = dto.maxProducts;
        if (dto.maxOrders !== undefined) out.maxOrders = dto.maxOrders;
        if (dto.notes !== undefined) out.notes = dto.notes;
        return out;
    }
}
