import {
    Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCompanyDto, InviteUserDto, UpdateCompanyDto } from './dto/create-company.dto';
import { runWithoutTenant } from '../common/tenant/tenant-storage';
import * as bcrypt from 'bcrypt';

const DEFAULT_ADMIN_PERMISSIONS = [
    { resource: '*', action: 'MANAGE' },
];

@Injectable()
export class CompanyService {
    constructor(private prisma: PrismaService) {}

    /**
     * Register a new company and its first admin user in a single transaction.
     * Called from the public onboarding endpoint — no auth required.
     */
    async registerCompany(dto: CreateCompanyDto) {
        return runWithoutTenant(async () => {
            // Check uniqueness
            const existing = await (this.prisma as any).company.findFirst({
                where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
            });
            if (existing) {
                throw new ConflictException('A company with that name or slug already exists');
            }

            const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
            if (emailTaken) {
                throw new ConflictException('Email already registered');
            }

            const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

            const company = await (this.prisma as any).company.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    plan: dto.plan ?? 'STARTER',
                    users: {
                        create: {
                            name: dto.adminName,
                            email: dto.adminEmail,
                            password: passwordHash,
                            roles: {
                                create: {
                                    name: 'Admin',
                                    description: 'Company administrator',
                                    isSystem: true,
                                    permissions: {
                                        createMany: {
                                            data: DEFAULT_ADMIN_PERMISSIONS,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                include: { users: { include: { roles: true } } },
            });

            // Assign companyId to the auto-created role (nested create doesn't cascade it)
            const adminUser = company.users[0];
            if (adminUser?.roles?.[0]) {
                await (this.prisma as any).role.update({
                    where: { id: adminUser.roles[0].id },
                    data: { companyId: company.id },
                });
            }

            return {
                id: company.id,
                name: company.name,
                slug: company.slug,
                plan: company.plan,
                adminUserId: adminUser?.id,
            };
        });
    }

    /** List all companies — super-admin only */
    async listCompanies() {
        return runWithoutTenant(() => (this.prisma as any).company.findMany({
            select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }));
    }

    /** Get a single company by id */
    async getCompany(id: string) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({
                where: { id },
                include: {
                    users: { select: { id: true, name: true, email: true, roles: { select: { name: true } } } },
                },
            });
            if (!company) throw new NotFoundException('Company not found');
            return company;
        });
    }

    /** Update mutable company fields (name, slug, plan) */
    async updateCompany(id: string, dto: UpdateCompanyDto) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id } });
            if (!company) throw new NotFoundException('Company not found');

            if (dto.name && dto.name !== company.name) {
                const conflict = await (this.prisma as any).company.findFirst({ where: { name: dto.name, id: { not: id } } });
                if (conflict) throw new ConflictException('A company with that name already exists');
            }
            if (dto.slug && dto.slug !== company.slug) {
                const conflict = await (this.prisma as any).company.findFirst({ where: { slug: dto.slug, id: { not: id } } });
                if (conflict) throw new ConflictException('A company with that slug already exists');
            }

            return (this.prisma as any).company.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.slug !== undefined && { slug: dto.slug }),
                    ...(dto.plan !== undefined && { plan: dto.plan }),
                },
                select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
            });
        });
    }

    /**
     * Invite a user to join the calling user's company.
     * Generates a temporary password — in production replace with email link.
     */
    async inviteUser(companyId: string, dto: InviteUserDto) {
        return runWithoutTenant(async () => {
            const company = await (this.prisma as any).company.findUnique({ where: { id: companyId } });
            if (!company) throw new NotFoundException('Company not found');

            const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (existing) throw new ConflictException('Email already registered');

            const tempPassword = dto.password || Math.random().toString(36).slice(-10);
            const passwordHash = await bcrypt.hash(tempPassword, 12);

            const userData: any = {
                name: dto.name,
                email: dto.email,
                password: passwordHash,
                companyId,
            };

            if (dto.roleId) {
                const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
                if (!role) throw new BadRequestException('Role not found');
                userData.roles = { connect: [{ id: dto.roleId }] };
            }

            const user = await this.prisma.user.create({ data: userData });

            return {
                userId: user.id,
                email: user.email,
                temporaryPassword: tempPassword, // deliver via email in production
            };
        });
    }

    /** Suspend or reactivate a company */
    async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
        return runWithoutTenant(() =>
            (this.prisma as any).company.update({ where: { id }, data: { status } })
        );
    }

    /** Health stats: last login, active users (logged in within 30 days), user count */
    async getTenantHealth(id: string) {
        return runWithoutTenant(async () => {
            const users = await (this.prisma.user.findMany as any)({
                where: { companyId: id },
                select: { id: true, lastLoginAt: true },
            });
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const activeUserCount = users.filter(
                (u: any) => u.lastLoginAt && new Date(u.lastLoginAt) >= thirtyDaysAgo,
            ).length;
            const lastLogin = users
                .map((u: any) => u.lastLoginAt)
                .filter(Boolean)
                .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
            const daysSinceLastActivity = lastLogin
                ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            return {
                totalUsers: users.length,
                activeUserCount,
                lastLoginAt: lastLogin,
                daysSinceLastActivity,
            };
        });
    }

    /** Usage counts for a single tenant — no new schema required */
    async getTenantMetrics(id: string) {
        return runWithoutTenant(async () => {
            const [warehouseCount, productCount, supplierCount, customerCount, userCount, orderCount] =
                await Promise.all([
                    this.prisma.warehouse.count({ where: { companyId: id } }),
                    this.prisma.product.count({ where: { companyId: id } }),
                    this.prisma.supplier.count({ where: { companyId: id } }),
                    this.prisma.customer.count({ where: { companyId: id } }),
                    this.prisma.user.count({ where: { companyId: id } }),
                    // Order has no direct companyId; count via warehouse
                    this.prisma.order.count({ where: { warehouse: { companyId: id } } }),
                ]);
            return { warehouseCount, productCount, supplierCount, customerCount, userCount, orderCount };
        });
    }

    /** Onboarding checklist — derived from usage counts */
    async getTenantOnboarding(id: string) {
        return runWithoutTenant(async () => {
            const [warehouseCount, productCount, supplierCount, customerCount, orderCount] =
                await Promise.all([
                    this.prisma.warehouse.count({ where: { companyId: id } }),
                    this.prisma.product.count({ where: { companyId: id } }),
                    this.prisma.supplier.count({ where: { companyId: id } }),
                    this.prisma.customer.count({ where: { companyId: id } }),
                    this.prisma.order.count({ where: { warehouse: { companyId: id } } }),
                ]);
            const steps = [
                { key: 'warehouse', label: 'Created a warehouse', done: warehouseCount > 0 },
                { key: 'product',   label: 'Added a product',    done: productCount > 0 },
                { key: 'supplier',  label: 'Added a supplier',   done: supplierCount > 0 },
                { key: 'customer',  label: 'Added a customer',   done: customerCount > 0 },
                { key: 'order',     label: 'Placed an order',    done: orderCount > 0 },
            ];
            const completedSteps = steps.filter(s => s.done).length;
            return {
                steps,
                completedSteps,
                totalSteps: steps.length,
                percentComplete: Math.round((completedSteps / steps.length) * 100),
            };
        });
    }
}
