
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector, private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<{ resource: string; action: string }>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermission) {
            return true; // No permission required
        }

        const request = context.switchToHttp().getRequest();
        const userId = request.headers['x-user-id'];

        if (!userId) {
            // For MVP/Demo, if no user ID is provided, we might default to Admin or fail.
            // Let's fail to enforce security, but log it.
            console.warn('No x-user-id header found');
            throw new UnauthorizedException('User not identified');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { permissions: true } } }
        });

        if (!user || !user.roles || user.roles.length === 0) {
            throw new UnauthorizedException('User or Roles not found');
        }

        const allPermissions = user.roles.flatMap(r => r.permissions);

        // Admin Super-User Check
        if (allPermissions.some(p => p.resource === 'ALL' && p.action === 'MANAGE')) {
            return true;
        }

        const hasPermission = allPermissions.some(
            (p) => p.resource === requiredPermission.resource && p.action === requiredPermission.action,
        );

        if (!hasPermission) {
            throw new ForbiddenException(`Missing permission: ${requiredPermission.resource}.${requiredPermission.action}`);
        }

        request.user = user;
        return true;
    }
}
