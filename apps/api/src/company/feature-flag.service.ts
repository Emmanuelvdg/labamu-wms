import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { runWithoutTenant } from '../common/tenant/tenant-storage';

export const KNOWN_FLAGS = [
    { key: 'ADVANCED_PICKING',     label: 'Advanced Picking',     description: 'Multi-step batch picking workflow' },
    { key: 'BETA_FLOOR_PLAN',      label: 'Beta Floor Plan',      description: 'Interactive warehouse floor plan editor' },
    { key: 'AI_REORDER',           label: 'AI Reorder Suggestions', description: 'ML-based reorder point recommendations' },
    { key: 'MULTI_CURRENCY',       label: 'Multi-Currency',       description: 'Support for multiple currencies on orders' },
    { key: 'SUPPLIER_PORTAL',      label: 'Supplier Portal',      description: 'Self-service portal for suppliers' },
    { key: 'ADVANCED_ANALYTICS',   label: 'Advanced Analytics',   description: 'Extended reporting and KPI dashboards' },
    { key: 'BARCODE_PRINT',        label: 'Barcode Printing',     description: 'Direct barcode label printing integration' },
    { key: 'API_ACCESS',           label: 'API Access',           description: 'Allow tenant to generate API keys' },
];

@Injectable()
export class FeatureFlagService {
    constructor(private prisma: PrismaService) {}

    getAvailableFlags() {
        return KNOWN_FLAGS;
    }

    async getFlagsForCompany(companyId: string) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id: companyId } });
            if (!company) throw new NotFoundException('Company not found');

            const stored = await (this.prisma as any).featureFlag.findMany({ where: { companyId } });
            const storedMap = new Map(stored.map((f: any) => [f.key, f]));

            return KNOWN_FLAGS.map(kf => ({
                ...kf,
                enabled: (storedMap.get(kf.key) as any)?.enabled ?? false,
                notes:   (storedMap.get(kf.key) as any)?.notes ?? null,
            }));
        });
    }

    async setFlag(companyId: string, key: string, enabled: boolean, notes?: string) {
        const known = KNOWN_FLAGS.find(f => f.key === key);
        if (!known) throw new NotFoundException(`Unknown feature flag: ${key}`);

        return runWithoutTenant(() =>
            (this.prisma as any).featureFlag.upsert({
                where: { companyId_key: { companyId, key } },
                create: { companyId, key, enabled, notes: notes ?? null },
                update: { enabled, ...(notes !== undefined && { notes }) },
            })
        );
    }
}
