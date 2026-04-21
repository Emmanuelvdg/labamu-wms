import {
    Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCompanyDto, InviteUserDto } from './dto/create-company.dto';
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
    }

    /** List all companies — super-admin only */
    async listCompanies() {
        return (this.prisma as any).company.findMany({
            select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    /** Get a single company by id */
    async getCompany(id: string) {
        const company = await (this.prisma as any).company.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true, email: true, roles: { select: { name: true } } } },
            },
        });
        if (!company) throw new NotFoundException('Company not found');
        return company;
    }

    /**
     * Invite a user to join the calling user's company.
     * Generates a temporary password — in production replace with email link.
     */
    async inviteUser(companyId: string, dto: InviteUserDto) {
        const company = await (this.prisma as any).company.findUnique({ where: { id: companyId } });
        if (!company) throw new NotFoundException('Company not found');

        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already registered');

        const tempPassword = Math.random().toString(36).slice(-10);
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
    }

    /** Suspend or reactivate a company */
    async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
        return (this.prisma as any).company.update({ where: { id }, data: { status } });
    }
}
