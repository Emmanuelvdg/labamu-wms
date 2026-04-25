import {
    Controller, Post, Get, Body, Param, Patch,
    HttpCode, HttpStatus, UseGuards, Request,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { AuditService } from './audit.service';
import { CreateCompanyDto, InviteUserDto, UpdateCompanyDto } from './dto/create-company.dto';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';

@Controller('companies')
@UseGuards(PermissionsGuard)
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
        private readonly auditService: AuditService,
    ) {}

    /**
     * Public endpoint — no auth required.
     * Creates a new company + first admin user (self-service onboarding).
     * No @RequirePermission means PermissionsGuard passes through.
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() dto: CreateCompanyDto) {
        return this.companyService.registerCompany(dto);
    }

    /** Super-admin only — list all companies. */
    @Get()
    @RequirePermission('ALL', 'MANAGE')
    listAll() {
        return this.companyService.listCompanies();
    }

    @Get(':id')
    @RequirePermission('ALL', 'MANAGE')
    getOne(@Param('id') id: string) {
        return this.companyService.getCompany(id);
    }

    /** Invite a user to a company. Super-admin only from the backoffice. */
    @Post(':id/invite')
    @HttpCode(HttpStatus.CREATED)
    @RequirePermission('ALL', 'MANAGE')
    invite(
        @Param('id') companyId: string,
        @Body() dto: InviteUserDto,
    ) {
        return this.companyService.inviteUser(companyId, dto);
    }

    @Patch(':id')
    @RequirePermission('ALL', 'MANAGE')
    async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Request() req: any) {
        const result = await this.companyService.updateCompany(id, dto);
        const actor = req.user;
        if (actor) {
            this.auditService.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'TENANT_UPDATE', targetType: 'COMPANY',
                targetId: id, targetLabel: result.name,
                metadata: dto as any,
            }).catch(() => {});
        }
        return result;
    }

    @Patch(':id/status')
    @RequirePermission('ALL', 'MANAGE')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
        @Request() req: any,
    ) {
        const result = await this.companyService.updateStatus(id, status);
        const actor = req.user;
        if (actor) {
            this.auditService.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'STATUS_CHANGE', targetType: 'COMPANY',
                targetId: id, targetLabel: id,
                metadata: { status },
            }).catch(() => {});
        }
        return result;
    }

    @Get(':id/health')
    @RequirePermission('ALL', 'MANAGE')
    getHealth(@Param('id') id: string) {
        return this.companyService.getTenantHealth(id);
    }

    @Get(':id/metrics')
    @RequirePermission('ALL', 'MANAGE')
    getMetrics(@Param('id') id: string) {
        return this.companyService.getTenantMetrics(id);
    }

    @Get(':id/onboarding')
    @RequirePermission('ALL', 'MANAGE')
    getOnboarding(@Param('id') id: string) {
        return this.companyService.getTenantOnboarding(id);
    }
}
