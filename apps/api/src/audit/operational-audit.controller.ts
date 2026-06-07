import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OperationalAuditService } from './operational-audit.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('audit/operations')
@UseGuards(PermissionsGuard)
export class OperationalAuditController {
    constructor(private auditService: OperationalAuditService) {}

    @Get()
    getAuditLog(
        @Query('companyId') companyId?: string,
        @Query('entity') entity?: string,
        @Query('entityId') entityId?: string,
        @Query('actorId') actorId?: string,
        @Query('action') action?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
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
