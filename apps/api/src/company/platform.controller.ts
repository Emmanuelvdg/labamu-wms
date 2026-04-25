import {
    Controller, Get, Post, Put, Delete, Patch, Body, Param,
    Query, HttpCode, HttpStatus, UseGuards, Request,
} from '@nestjs/common';
import { PlanService, UpsertPlanDto } from './plan.service';
import { FeatureFlagService } from './feature-flag.service';
import { AuditService } from './audit.service';
import { PlatformService } from './platform.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';

@Controller()
@UseGuards(PermissionsGuard)
export class PlatformController {

    constructor(
        private plan: PlanService,
        private flags: FeatureFlagService,
        private audit: AuditService,
        private platform: PlatformService,
    ) {}

    // ── Plan & Limits (Phase 5) ───────────────────────────────────────────────

    @Get('companies/:id/plan')
    @RequirePermission('ALL', 'MANAGE')
    getPlan(@Param('id') id: string) {
        return this.plan.getPlan(id);
    }

    @Put('companies/:id/plan')
    @RequirePermission('ALL', 'MANAGE')
    upsertPlan(@Param('id') id: string, @Body() dto: UpsertPlanDto, @Request() req: any) {
        const actor = req.user;
        const result = this.plan.upsertPlan(id, dto);
        if (actor) {
            result.then(p => this.audit.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'PLAN_UPDATE', targetType: 'COMPANY',
                targetId: id, targetLabel: id,
                metadata: dto as any,
            })).catch(() => {});
        }
        return result;
    }

    @Get('companies/:id/plan/limits')
    @RequirePermission('ALL', 'MANAGE')
    getLimits(@Param('id') id: string) {
        return this.plan.getLimits(id);
    }

    // ── Feature Flags (Phase 7) ───────────────────────────────────────────────

    @Get('feature-flags/available')
    @RequirePermission('ALL', 'MANAGE')
    getAvailableFlags() {
        return this.flags.getAvailableFlags();
    }

    @Get('companies/:id/feature-flags')
    @RequirePermission('ALL', 'MANAGE')
    getFlags(@Param('id') id: string) {
        return this.flags.getFlagsForCompany(id);
    }

    @Put('companies/:id/feature-flags/:key')
    @RequirePermission('ALL', 'MANAGE')
    setFlag(
        @Param('id') id: string,
        @Param('key') key: string,
        @Body() body: { enabled: boolean; notes?: string },
        @Request() req: any,
    ) {
        const actor = req.user;
        const result = this.flags.setFlag(id, key, body.enabled, body.notes);
        if (actor) {
            result.then(() => this.audit.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'FLAG_TOGGLE', targetType: 'COMPANY',
                targetId: id, targetLabel: `${key}=${body.enabled}`,
            })).catch(() => {});
        }
        return result;
    }

    // ── Audit Log (Phase 6) ───────────────────────────────────────────────────

    @Get('platform/audit-log')
    @RequirePermission('ALL', 'MANAGE')
    getAuditLog(@Query('limit') limit?: string) {
        return this.audit.listAll(limit ? parseInt(limit, 10) : 200);
    }

    // ── Impersonation (Phase 6) ───────────────────────────────────────────────

    @Post('companies/:id/impersonate')
    @HttpCode(HttpStatus.OK)
    @RequirePermission('ALL', 'MANAGE')
    async impersonate(@Param('id') id: string, @Request() req: any) {
        const actor = req.user;
        const result = await this.platform.impersonate(id, actor.id, actor.email);
        await this.audit.log({
            actorId: actor.id, actorEmail: actor.email,
            action: 'IMPERSONATE', targetType: 'COMPANY',
            targetId: id, targetLabel: result.companyName,
        }).catch(() => {});
        return result;
    }

    // ── Analytics (Phase 8) ──────────────────────────────────────────────────

    @Get('platform/analytics')
    @RequirePermission('ALL', 'MANAGE')
    getAnalytics() {
        return this.platform.getAnalytics();
    }

    // ── Announcements (Phase 9) ───────────────────────────────────────────────

    @Get('platform/announcements')
    listAnnouncements() {
        // Public — tenant app calls this without admin auth
        return this.platform.listAnnouncements();
    }

    @Get('platform/announcements/active')
    getActiveAnnouncements(
        @Query('companyId') companyId?: string,
        @Query('plan') plan?: string,
    ) {
        return this.platform.getActiveAnnouncements(companyId, plan);
    }

    @Post('platform/announcements')
    @HttpCode(HttpStatus.CREATED)
    @RequirePermission('ALL', 'MANAGE')
    createAnnouncement(@Body() dto: any, @Request() req: any) {
        const actor = req.user;
        const result = this.platform.createAnnouncement({ ...dto, createdById: actor.id });
        result.then(a => this.audit.log({
            actorId: actor.id, actorEmail: actor.email,
            action: 'ANNOUNCE', targetType: 'COMPANY',
            targetId: 'ALL', targetLabel: dto.title,
        })).catch(() => {});
        return result;
    }

    @Delete('platform/announcements/:id')
    @RequirePermission('ALL', 'MANAGE')
    deleteAnnouncement(@Param('id') id: string) {
        return this.platform.deleteAnnouncement(id);
    }

    // ── Bulk Operations (Phase 9) ─────────────────────────────────────────────

    @Patch('companies/bulk/status')
    @RequirePermission('ALL', 'MANAGE')
    bulkStatus(
        @Body() body: { companyIds: string[]; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' },
        @Request() req: any,
    ) {
        const actor = req.user;
        const result = this.platform.bulkStatusChange(body.companyIds, body.status);
        result.then(() => Promise.all(body.companyIds.map(cid =>
            this.audit.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'BULK_STATUS', targetType: 'COMPANY',
                targetId: cid, targetLabel: cid,
                metadata: { status: body.status },
            })
        ))).catch(() => {});
        return result;
    }

    @Patch('companies/bulk/plan')
    @RequirePermission('ALL', 'MANAGE')
    bulkPlan(
        @Body() body: { companyIds: string[]; plan: string },
        @Request() req: any,
    ) {
        const actor = req.user;
        const result = this.platform.bulkPlanChange(body.companyIds, body.plan);
        result.then(() => Promise.all(body.companyIds.map(cid =>
            this.audit.log({
                actorId: actor.id, actorEmail: actor.email,
                action: 'BULK_PLAN', targetType: 'COMPANY',
                targetId: cid, targetLabel: cid,
                metadata: { plan: body.plan },
            })
        ))).catch(() => {});
        return result;
    }
}
