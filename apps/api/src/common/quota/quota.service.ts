import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { runWithoutTenant } from '../tenant/tenant-storage';

type QuotaResource = 'users' | 'warehouses' | 'products' | 'orders';

const PLAN_LIMITS: Record<string, Record<QuotaResource, number | null>> = {
    FREE:         { users: 3,    warehouses: 1,    products: 100,  orders: 50   },
    STARTER:      { users: 10,   warehouses: 3,    products: 1000, orders: 500  },
    PROFESSIONAL: { users: 50,   warehouses: 10,   products: 5000, orders: null },
    ENTERPRISE:   { users: null, warehouses: null, products: null, orders: null },
};

@Injectable()
export class QuotaService {
    constructor(private prisma: PrismaService) {}

    /**
     * Check whether the company can still create a new resource of the given type.
     * Throws ForbiddenException if the plan limit is reached.
     * No-ops when companyId is null (dev/E2E) or when the plan is ENTERPRISE (unlimited).
     */
    async enforce(companyId: string | null, resource: QuotaResource): Promise<void> {
        if (!companyId) return; // dev / E2E — no enforcement
        if (process.env.NODE_ENV !== 'production') return; // only enforce in production

        const company = await runWithoutTenant(() =>
            (this.prisma as any).company.findUnique({
                where: { id: companyId },
                select: { plan: true, tenantPlan: true },
            })
        ) as any;
        if (!company) return;

        const planKey = (company.plan ?? 'STARTER').toUpperCase();
        const defaults = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.STARTER;

        // Per-company override takes precedence over plan defaults
        const limit: number | null = company.tenantPlan?.[`max${capitalize(resource)}`] ?? defaults[resource];
        if (limit === null) return; // unlimited

        const count = await this.currentCount(companyId, resource);
        if (count >= limit) {
            throw new ForbiddenException(
                `Plan limit reached: your ${planKey} plan allows up to ${limit} ${resource}. ` +
                `Upgrade your plan to add more.`
            );
        }
    }

    private async currentCount(companyId: string, resource: QuotaResource): Promise<number> {
        switch (resource) {
            case 'users':
                return this.prisma.user.count({ where: { companyId } });
            case 'warehouses':
                return this.prisma.warehouse.count({ where: { companyId } });
            case 'products':
                return this.prisma.product.count({ where: { companyId } });
            case 'orders':
                return this.prisma.order.count({ where: { warehouse: { companyId } } });
        }
    }
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
