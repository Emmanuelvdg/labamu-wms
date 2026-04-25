import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { runWithoutTenant } from '../common/tenant/tenant-storage';

@Injectable()
export class PlatformService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    // ── Analytics ────────────────────────────────────────────────────────────

    async getAnalytics() {
        return runWithoutTenant(async () => {
            const companies = await (this.prisma as any).company.findMany({
                select: { id: true, plan: true, status: true, createdAt: true },
            });

            // Plan distribution
            const planDist: Record<string, number> = {};
            const statusDist: Record<string, number> = {};
            companies.forEach((c: any) => {
                planDist[c.plan] = (planDist[c.plan] ?? 0) + 1;
                statusDist[c.status] = (statusDist[c.status] ?? 0) + 1;
            });

            // New tenants per month (last 12 months)
            const now = new Date();
            const months: { month: string; count: number }[] = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                const count = companies.filter((c: any) => {
                    const cd = new Date(c.createdAt);
                    return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
                }).length;
                months.push({ month: label, count });
            }

            const [totalUsers, totalOrders] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.order.count(),
            ]);

            return {
                totalTenants: companies.length,
                totalUsers,
                totalOrders,
                planDistribution: Object.entries(planDist).map(([plan, count]) => ({ plan, count })),
                statusDistribution: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
                tenantsPerMonth: months,
            };
        });
    }

    // ── Impersonation ────────────────────────────────────────────────────────

    async impersonate(companyId: string, adminId: string, adminEmail: string) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({
                where: { id: companyId },
                select: { id: true, name: true, slug: true },
            });
            if (!company) throw new NotFoundException('Company not found');

            // Short-lived 15-minute token scoped to the target tenant
            const token = this.jwtService.sign(
                {
                    sub: adminId,
                    email: adminEmail,
                    companyId: company.id,
                    companySlug: company.slug,
                    impersonating: true,
                    impersonatingCompanyName: company.name,
                },
                { expiresIn: '15m' },
            );

            return { token, companyId: company.id, companyName: company.name };
        });
    }

    // ── Announcements ────────────────────────────────────────────────────────

    async createAnnouncement(dto: {
        title: string;
        body: string;
        targetType?: string;
        targetValue?: string;
        startsAt?: string;
        endsAt?: string;
        createdById: string;
    }) {
        return runWithoutTenant(() =>
            (this.prisma as any).announcement.create({
                data: {
                    title: dto.title,
                    body: dto.body,
                    targetType: dto.targetType ?? 'ALL',
                    targetValue: dto.targetValue ?? null,
                    startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
                    endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
                    createdById: dto.createdById,
                },
            })
        );
    }

    async listAnnouncements() {
        return runWithoutTenant(() =>
            (this.prisma as any).announcement.findMany({
                orderBy: { startsAt: 'desc' },
            })
        );
    }

    async deleteAnnouncement(id: string) {
        return runWithoutTenant(async () => {
            const found = await (this.prisma as any).announcement.findUnique({ where: { id } });
            if (!found) throw new NotFoundException('Announcement not found');
            return (this.prisma as any).announcement.delete({ where: { id } });
        });
    }

    /** Public — returns active announcements relevant to a company */
    async getActiveAnnouncements(companyId?: string, plan?: string) {
        return runWithoutTenant(async () => {
            const now = new Date();
            const all = await (this.prisma as any).announcement.findMany({
                where: {
                    startsAt: { lte: now },
                    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
                },
                orderBy: { startsAt: 'desc' },
            });
            return all.filter((a: any) => {
                if (a.targetType === 'ALL') return true;
                if (a.targetType === 'PLAN' && plan && a.targetValue === plan) return true;
                if (a.targetType === 'COMPANY' && companyId && a.targetValue === companyId) return true;
                return false;
            });
        });
    }

    // ── Bulk operations ──────────────────────────────────────────────────────

    async bulkStatusChange(companyIds: string[], status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
        return runWithoutTenant(async () => {
            const result = await (this.prisma as any).company.updateMany({
                where: { id: { in: companyIds } },
                data: { status },
            });
            return { updated: result.count };
        });
    }

    async bulkPlanChange(companyIds: string[], plan: string) {
        return runWithoutTenant(async () => {
            const result = await (this.prisma as any).company.updateMany({
                where: { id: { in: companyIds } },
                data: { plan },
            });
            return { updated: result.count };
        });
    }
}
