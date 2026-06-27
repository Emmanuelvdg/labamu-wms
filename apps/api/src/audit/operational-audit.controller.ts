import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { OperationalAuditService } from './operational-audit.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';

@Controller('audit/operations')
@UseGuards(PermissionsGuard)
export class OperationalAuditController {
    constructor(private auditService: OperationalAuditService) {}

    @Get()
    @RequirePermission('AUDIT', 'READ')
    getAuditLog(
        @Req() req: Request,
        @Query('entity') entity?: string,
        @Query('entityId') entityId?: string,
        @Query('actorId') actorId?: string,
        @Query('action') action?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        const companyId = (req as any).user?.companyId ?? undefined;
        return this.auditService.getAuditLog({
            companyId,
            entity,
            entityId,
            actorId,
            action,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            skip: skip ? parseInt(skip, 10) : undefined,
        });
    }
}
