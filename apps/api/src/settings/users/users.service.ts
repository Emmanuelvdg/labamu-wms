
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../common/email/email.service';
import { QuotaService } from '../../common/quota/quota.service';
import { getCurrentCompanyId } from '../../common/tenant/tenant-storage';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private quotaService: QuotaService,
    ) { }

    private omitPassword<T extends { password?: any }>(user: T): Omit<T, 'password'> {
        const { password: _pw, ...safe } = user as any;
        return safe;
    }

    async getUsers() {
        const companyId = getCurrentCompanyId();
        const users = await this.prisma.user.findMany({
            where: companyId ? { companyId } : {},
            include: { roles: true, warehouses: true },
            orderBy: { name: 'asc' }
        });
        return users.map(u => this.omitPassword(u));
    }

    async getUser(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { roles: true, warehouses: true }
        });
        if (!user) throw new NotFoundException('User not found');
        return this.omitPassword(user);
    }

    async createUser(data: {
        name: string;
        email: string;
        password?: string;
        roleIds?: string[];
        warehouseIds?: string[];
    }) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new BadRequestException('Email already exists');

        // Enforce plan quota before creating the user
        await this.quotaService.enforce(getCurrentCompanyId(), 'users');

        const hashedPassword = await bcrypt.hash(data.password || 'changeme123', 10);

        const created = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                roles: {
                    connect: data.roleIds?.map(id => ({ id })) || []
                },
                warehouses: {
                    connect: data.warehouseIds?.map(id => ({ id })) || []
                },
            },
            include: { roles: true, warehouses: true }
        });

        // Send welcome email (fire-and-forget — don't block the response)
        this.emailService.sendWelcome(created.email, created.name).catch(() => {});

        return this.omitPassword(created);
    }

    async updateUser(id: string, data: {
        name?: string;
        email?: string;
        password?: string;
        roleIds?: string[];
        warehouseIds?: string[];
    }) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (data.email && data.email !== user.email) {
            const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
            if (existing) throw new BadRequestException('Email already exists');
        }

        const updated = await this.prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                password: data.password ? await bcrypt.hash(data.password, 10) : undefined,
                roles: {
                    set: data.roleIds?.map(id => ({ id })) || []
                },
                warehouses: {
                    set: data.warehouseIds?.map(id => ({ id })) || []
                },
            },
            include: { roles: true, warehouses: true }
        });
        return this.omitPassword(updated);
    }

    async deleteUser(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }

    async resetPassword(id: string, newPassword: string) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });
    }
}
