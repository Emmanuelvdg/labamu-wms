import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@labamu/database';
import { getCurrentCompanyId } from './common/tenant/tenant-storage';

/**
 * Models that carry companyId and must be automatically filtered per-tenant
 * when a JWT-derived companyId is present in the AsyncLocalStorage store.
 * Legacy x-user-id requests have companyId=null and are unscoped (dev/E2E).
 */
const TENANT_SCOPED_MODELS = new Set([
    'Product',
    'Warehouse',
    'Supplier',
    'Customer',
    'User',
    'Role',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super();
        // $use is deprecated in Prisma 5 but still functional; migrate to
        // $extends client-level query extensions when Prisma removes $use.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore – deprecated but works in Prisma 5.x
        this.$use(async (params, next) => {
            if (!params.model || !TENANT_SCOPED_MODELS.has(params.model)) return next(params);

            const companyId = getCurrentCompanyId();
            if (!companyId) return next(params);

            const readOps = ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'findFirstOrThrow'];
            const writeOps = ['create', 'createMany'];
            const mutateOps = ['update', 'updateMany', 'upsert'];

            if (readOps.includes(params.action)) {
                params.args ??= {};
                params.args.where ??= {};
                if (params.args.where.companyId === undefined) {
                    params.args.where.companyId = companyId;
                }
            }

            if (writeOps.includes(params.action)) {
                params.args ??= {};
                if (params.action === 'createMany') {
                    params.args.data = (params.args.data ?? []).map((d: any) => ({ companyId, ...d }));
                } else {
                    params.args.data ??= {};
                    params.args.data.companyId ??= companyId;
                }
            }

            if (mutateOps.includes(params.action)) {
                params.args ??= {};
                params.args.where ??= {};
                if (params.args.where.companyId === undefined) {
                    params.args.where.companyId = companyId;
                }
            }

            return next(params);
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
