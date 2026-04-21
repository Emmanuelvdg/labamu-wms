import {
    Injectable, CanActivate, ExecutionContext,
    UnauthorizedException, ForbiddenException, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<{ resource: string; action: string }>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermission) return true;

        const request = context.switchToHttp().getRequest();

        // ── Resolve userId + companyId ─────────────────────────────────────
        let userId: string | undefined;
        let companyId: string | null = null;

        const authHeader: string | undefined = request.headers['authorization'];

        if (authHeader?.startsWith('Bearer ')) {
            // JWT path
            try {
                const payload = this.jwtService.verify<{ sub: string; companyId?: string }>(
                    authHeader.slice(7),
                    { secret: process.env.JWT_SECRET ?? 'labamu-jwt-secret-change-in-production-please' },
                );
                userId = payload.sub;
                companyId = payload.companyId ?? null;
            } catch {
                throw new UnauthorizedException('Invalid or expired token');
            }
        } else {
            // Legacy x-user-id path (E2E tests, dev tooling)
            userId = request.headers['x-user-id'] ?? request.query?.userId;
        }

        if (!userId) {
            this.logger.warn('Permission check failed: no auth identifier present');
            throw new UnauthorizedException('User not identified');
        }

        // ── Load user ──────────────────────────────────────────────────────
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { permissions: true } }, warehouses: true },
        });

        if (!user) {
            this.logger.warn(`Permission check failed: User ${userId} not found`);
            throw new UnauthorizedException('User not found');
        }

        if (!user.roles || user.roles.length === 0) {
            this.logger.warn(`Permission check failed: User ${userId} has no roles`);
            throw new ForbiddenException('User has no roles assigned');
        }

        // ── Check permissions ──────────────────────────────────────────────
        const allPermissions = user.roles.flatMap(r => r.permissions);

        const hasWildcard = allPermissions.some(
            p => (p.resource === '*' || p.resource === 'ALL') &&
                 (p.action === '*' || p.action === 'MANAGE'),
        );

        if (hasWildcard) {
            request.user = { ...user, companyId: companyId ?? (user as any).companyId ?? null };
            return true;
        }

        const hasPermission = allPermissions.some(
            p => (p.resource === requiredPermission.resource || p.resource === '*') &&
                 (p.action === requiredPermission.action || p.action === '*'),
        );

        if (!hasPermission) {
            this.logger.warn(
                `Permission denied: ${user.email} attempted ${requiredPermission.action} on ${requiredPermission.resource}`,
            );
            throw new ForbiddenException(
                `Insufficient permissions. Required: ${requiredPermission.resource}:${requiredPermission.action}`,
            );
        }

        request.user = { ...user, companyId: companyId ?? (user as any).companyId ?? null };
        return true;
    }
}
