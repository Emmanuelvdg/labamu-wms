import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { runWithoutTenant } from '../common/tenant/tenant-storage';

export type AuditAction =
    | 'TENANT_CREATE'
    | 'TENANT_UPDATE'
    | 'STATUS_CHANGE'
    | 'PLAN_UPDATE'
    | 'IMPERSONATE'
    | 'FLAG_TOGGLE'
    | 'ANNOUNCE'
    | 'BULK_STATUS'
    | 'BULK_PLAN';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) {}

    log(params: {
        actorId: string;
        actorEmail: string;
        action: AuditAction;
        targetType: 'COMPANY' | 'USER';
        targetId: string;
        targetLabel: string;
        metadata?: Record<string, any>;
    }) {
        return runWithoutTenant(() =>
            (this.prisma as any).auditLog.create({
                data: {
                    actorId: params.actorId,
                    actorEmail: params.actorEmail,
                    action: params.action,
                    targetType: params.targetType,
                    targetId: params.targetId,
                    targetLabel: params.targetLabel,
                    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                },
            })
        );
    }

    listAll(limit = 200) {
        return runWithoutTenant(() =>
            (this.prisma as any).auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
            })
        );
    }
}
