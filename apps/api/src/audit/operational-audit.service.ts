import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type AuditAction =
    | 'ADJUSTMENT_APPLIED'
    | 'PO_APPROVED'
    | 'PO_REJECTED'
    | 'GOODS_RECEIVED'
    | 'ORDER_STATUS_CHANGED'
    | 'ORDER_SHIPPED';

export type AuditEntity = 'Adjustment' | 'PurchaseOrder' | 'Order';

@Injectable()
export class OperationalAuditService {
    private readonly logger = new Logger(OperationalAuditService.name);

    constructor(private prisma: PrismaService) {}

    async log(params: {
        companyId?: string;
        actorId?: string;
        actorEmail?: string;
        action: AuditAction;
        entity: AuditEntity;
        entityId: string;
        before?: Record<string, any>;
        after?: Record<string, any>;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            await this.prisma.operationalAuditLog.create({
                data: {
                    companyId: params.companyId,
                    actorId: params.actorId,
                    actorEmail: params.actorEmail,
                    action: params.action,
                    entity: params.entity,
                    entityId: params.entityId,
                    before: params.before ? JSON.stringify(params.before) : null,
                    after: params.after ? JSON.stringify(params.after) : null,
                    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                },
            });
        } catch (err: any) {
            // Audit must never break the primary operation
            this.logger.error(`Audit log failed [${params.action} ${params.entity}:${params.entityId}]: ${err?.message}`);
        }
    }

    async getAuditLog(filters: {
        companyId?: string;
        entity?: string;
        entityId?: string;
        actorId?: string;
        action?: string;
        dateFrom?: Date;
        dateTo?: Date;
        take?: number;
        skip?: number;
    }) {
        const where: any = {};
        if (filters.companyId) where.companyId = filters.companyId;
        if (filters.entity) where.entity = filters.entity;
        if (filters.entityId) where.entityId = filters.entityId;
        if (filters.actorId) where.actorId = filters.actorId;
        if (filters.action) where.action = filters.action;
        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
            if (filters.dateTo) where.createdAt.lte = filters.dateTo;
        }

        const take = Math.min(filters.take ?? 50, 500);
        const skip = filters.skip ?? 0;

        const [data, total] = await Promise.all([
            this.prisma.operationalAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.operationalAuditLog.count({ where }),
        ]);

        return { data, total, take, skip };
    }
}
