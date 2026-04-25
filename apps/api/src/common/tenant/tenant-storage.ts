import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
    companyId: string | null;
}

/**
 * Process-wide AsyncLocalStorage that holds the current tenant for the
 * lifetime of a single HTTP request. Set once in TenantMiddleware,
 * read by the Prisma middleware to auto-scope all queries.
 */
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getCurrentCompanyId(): string | null {
    return tenantStorage.getStore()?.companyId ?? null;
}

/**
 * Run `fn` with tenant scoping disabled (companyId = null).
 * Use for cross-tenant admin operations (CompanyService, etc.) that must
 * not be filtered or corrupted by the Prisma tenant middleware.
 */
export function runWithoutTenant<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        tenantStorage.run({ companyId: null }, () => {
            fn().then(resolve).catch(reject);
        });
    });
}
