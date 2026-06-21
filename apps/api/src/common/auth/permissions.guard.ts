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

        // ── API-key fast path ──────────────────────────────────────────────
        // ApiKeyGuard runs before this guard and pre-populates request.user.
        // API keys carry explicit scopes — treat any authenticated API key
        // user as fully authorised for tenant-scoped operations.
        if (request.user?.authMethod === 'api-key') {
            return true;
        }

        // ── Resolve userId + companyId ─────────────────────────────────────
        let userId: string | undefined;
        let companyId: string | null = null;

        const secret = process.env.JWT_SECRET!;
        const authHeader: string | undefined = request.headers['authorization'];

        if (authHeader?.startsWith('Bearer ')) {
            // JWT path — explicit Authorization header
            try {
                const payload = this.jwtService.verify<{ sub: string; companyId?: string }>(
                    authHeader.slice(7), { secret },
                );
                userId = payload.sub;
                companyId = payload.companyId ?? null;
            } catch {
                throw new UnauthorizedException('Invalid or expired token');
            }
        } else {
            // Try the httpOnly `token` cookie forwarded by Next.js rewrite
            const cookieHeader: string = request.headers['cookie'] ?? '';
            const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
            if (tokenMatch) {
                try {
                    const payload = this.jwtService.verify<{ sub: string; companyId?: string }>(
                        tokenMatch[1], { secret },
                    );
                    userId = payload.sub;
                    companyId = payload.companyId ?? null;
                } catch {
                    // Invalid cookie token — fall through to userId check
                }
            }

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

        // Platform-level check (resource === 'ALL'): strict literal match only.
        // Tenant admins with '*:MANAGE' (scoped to their own tenant) must NOT be
        // able to access platform endpoints — only users seeded with 'ALL:MANAGE' pass.
        if (requiredPermission.resource === 'ALL') {
            const hasPlatformAccess = allPermissions.some(
                p => p.resource === 'ALL' &&
                     (p.action === requiredPermission.action || p.action === '*'),
            );
            if (!hasPlatformAccess) {
                this.logger.warn(
                    `Platform access denied: ${user.email} attempted ${requiredPermission.action} on ALL`,
                );
                throw new ForbiddenException('Platform administration access required');
            }
            request.user = { ...user, companyId: companyId ?? (user as any).companyId ?? null };
            return true;
        }

        // Tenant-scoped checks: '*:MANAGE' or 'ALL:MANAGE' grants full access
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
