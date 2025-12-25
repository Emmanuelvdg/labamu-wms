
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async createRole(data: { name: string; description?: string; permissions?: { resource: string; action: string }[] }) {
        const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
        if (existing) throw new BadRequestException('Role with this name already exists');

        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                permissions: {
                    create: data.permissions || []
                }
            },
            include: { permissions: true }
        });
    }

    async getRoles() {
        return this.prisma.role.findMany({
            include: { permissions: true, _count: { select: { users: true } } }
        });
    }

    async getRole(id: string) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: { permissions: true }
        });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async updateRole(id: string, data: { name?: string; description?: string; permissions?: { resource: string; action: string }[] }) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        if (role.isSystem && data.name && data.name !== role.name) {
            throw new BadRequestException('Cannot rename system roles');
        }

        // Update basic info
        await this.prisma.role.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description
            }
        });

        // Update permissions if provided (replace all)
        if (data.permissions) {
            await this.prisma.permission.deleteMany({ where: { roleId: id } });
            await this.prisma.permission.createMany({
                data: data.permissions.map(p => ({
                    roleId: id,
                    resource: p.resource,
                    action: p.action
                }))
            });
        }

        return this.getRole(id);
    }

    async deleteRole(id: string) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        if (role.isSystem) throw new BadRequestException('Cannot delete system roles');

        // Check if users are assigned
        const userCount = await this.prisma.user.count({
            where: {
                roles: {
                    some: { id: id }
                }
            }
        });
        if (userCount > 0) throw new BadRequestException('Cannot delete role with assigned users');

        return this.prisma.role.delete({ where: { id } });
    }

    async getAvailablePermissions() {
        const resources = [
            'INVENTORY', 'PRODUCTS', 'WAREHOUSE', 'LOCATIONS',
            'ORDERS', 'PURCHASE_ORDERS', 'ADJUSTMENTS',
            'SUPPLIERS', 'CUSTOMERS', 'USERS', 'ROLES', 'REPORTS', 'SETTINGS'
        ];

        const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'];

        const permissions = [];
        for (const resource of resources) {
            for (const action of actions) {
                permissions.push({ resource, action, label: `${resource}:${action}` });
            }
        }

        // Add wildcard permissions
        permissions.push({ resource: '*', action: '*', label: 'All Permissions (Admin)' });

        return permissions;
    }
}
