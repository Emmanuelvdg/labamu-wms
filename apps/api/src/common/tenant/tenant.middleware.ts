import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { tenantStorage } from './tenant-storage';

/**
 * Runs on every request before guards/handlers.
 * Extracts companyId from:
 *   1. JWT Bearer token  (production)
 *   2. x-user-id header  (legacy dev/E2E path — companyId stays null)
 *
 * Wraps the rest of the request handler inside tenantStorage.run() so that
 * the Prisma middleware can call getCurrentCompanyId() from any service.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private jwtService: JwtService) {}

    use(req: Request, res: Response, next: NextFunction) {
        let companyId: string | null = null;
        const secret = process.env.JWT_SECRET!;

        // 1. Prefer explicit Authorization: Bearer header
        const authHeader = req.headers['authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            try {
                const payload = this.jwtService.verify<{ companyId?: string }>(authHeader.slice(7), { secret });
                companyId = payload.companyId ?? null;
            } catch {
                // Invalid token — guard will reject it; leave companyId null
            }
        }

        // 2. Fall back to the httpOnly `token` cookie forwarded by Next.js rewrite
        if (!companyId) {
            const cookieHeader = req.headers['cookie'] ?? '';
            const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
            if (tokenMatch) {
                try {
                    const payload = this.jwtService.verify<{ companyId?: string }>(tokenMatch[1], { secret });
                    companyId = payload.companyId ?? null;
                } catch {
                    // Invalid cookie token — leave companyId null
                }
            }
        }

        tenantStorage.run({ companyId }, () => next());
    }
}
