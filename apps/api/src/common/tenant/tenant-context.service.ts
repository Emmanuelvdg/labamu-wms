import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped service that holds the current tenant's companyId.
 *
 * Controllers set it after resolving the authenticated user:
 *   this.tenantContext.companyId = req.user.companyId;
 *
 * Services read it to scope Prisma queries:
 *   const companyId = this.tenantContext.companyId;
 *   await this.prisma.product.findMany({ where: { companyId } });
 *
 * When companyId is null the caller is using the legacy x-user-id path
 * (dev/E2E), and the query is intentionally unscoped.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
    companyId: string | null = null;
}
