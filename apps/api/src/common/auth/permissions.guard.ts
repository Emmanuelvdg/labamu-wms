
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(private reflector: Reflector, private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<{ resource: string; action: string }>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // No permission decorator means endpoint is public or uses different auth
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const userId = request.headers['x-user-id'];

        if (!userId) {
            this.logger.warn('Permission check failed: No x-user-id header found');
            throw new UnauthorizedException('User not identified');
        }

        // Fetch user with roles and permissions
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: { permissions: true }
                },
                warehouses: true
            }
        });

        if (!user) {
            this.logger.warn(`Permission check failed: User ${userId} not found`);
            throw new UnauthorizedException('User not found');
        }

        if (!user.roles || user.roles.length === 0) {
            this.logger.warn(`Permission check failed: User ${userId} has no roles assigned`);
            throw new ForbiddenException('User has no roles assigned');
        }

        const allPermissions = user.roles.flatMap(r => r.permissions);

        // Check for admin/super-user permission (wildcard)
        const hasWildcard = allPermissions.some(p =>
            (p.resource === '*' || p.resource === 'ALL') &&
            (p.action === '*' || p.action === 'MANAGE')
        );

        if (hasWildcard) {
            this.logger.log(`User ${user.email} granted access via wildcard permission`);
            request.user = user;
            return true;
        }

        // Check for specific permission
        const hasPermission = allPermissions.some(p =>
            (p.resource === requiredPermission.resource || p.resource === '*') &&
            (p.action === requiredPermission.action || p.action === '*')
        );

        if (!hasPermission) {
            this.logger.warn(
                `Permission denied: User ${user.email} attempted ${requiredPermission.action} on ${requiredPermission.resource}`
            );
            throw new ForbiddenException(
                `Insufficient permissions. Required: ${requiredPermission.resource}:${requiredPermission.action}`
            );
        }

        // Log successful authorization
        this.logger.debug(
            `Permission granted: User ${user.email} can ${requiredPermission.action} on ${requiredPermission.resource}`
        );

        request.user = user;
        return true;
    }
}
