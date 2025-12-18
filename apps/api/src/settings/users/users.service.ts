
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getUsers() {
        return this.prisma.user.findMany({
            include: { roles: true, warehouses: true },
            orderBy: { name: 'asc' }
        });
    }

    async getUser(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { roles: true, warehouses: true }
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
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

        return this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password || 'password',
                roles: {
                    connect: data.roleIds?.map(id => ({ id })) || []
                },
                warehouses: {
                    connect: data.warehouseIds?.map(id => ({ id })) || []
                },
            },
            include: { roles: true, warehouses: true }
        });
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

        return this.prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                password: data.password,
                roles: {
                    set: data.roleIds?.map(id => ({ id })) || []
                },
                warehouses: {
                    set: data.warehouseIds?.map(id => ({ id })) || []
                },
            },
            include: { roles: true, warehouses: true }
        });
    }

    async deleteUser(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }
}
