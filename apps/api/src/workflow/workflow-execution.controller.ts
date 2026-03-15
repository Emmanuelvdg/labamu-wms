import { Controller, Get, Post, Put, Param, Query, UseGuards, Body } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { PrismaService } from '../prisma.service';

@Controller('workflow-instances')
@UseGuards(PermissionsGuard)
export class WorkflowExecutionController {
    constructor(
        private engineService: WorkflowEngineService,
        private prisma: PrismaService
    ) { }

    @Post(':id/start')
    @RequirePermission('WORKFLOW', 'CREATE')
    async startWorkflow(
        @Param('id') templateId: string,
        @Body() body: { warehouseId: string; triggerRef?: string; triggerType?: string }
    ) {
        return this.engineService.startWorkflow(
            templateId,
            body.warehouseId,
            body.triggerRef,
            body.triggerType
        );
    }

    @Get()
    @RequirePermission('WORKFLOW', 'READ')
    async listInstances(@Query('warehouseId') warehouseId?: string) {
        const where = warehouseId ? { warehouseId } : {};
        return this.prisma.workflowInstance.findMany({
            where,
            include: { template: true },
            orderBy: { startedAt: 'desc' },
            take: 50
        });
    }

    @Get(':id')
    @RequirePermission('WORKFLOW', 'READ')
    async getInstanceDetails(@Param('id') id: string) {
        return this.prisma.workflowInstance.findUnique({
            where: { id },
            include: {
                template: { include: { steps: true, transitions: true } },
                tasks: { include: { step: true }, orderBy: { startedAt: 'desc' } },
                auditLogs: { orderBy: { timestamp: 'desc' } }
            }
        });
    }

    @Post(':id/advance')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async advance(@Param('id') id: string) {
        await this.engineService.advanceWorkflow(id);
        return { success: true };
    }

    @Post(':id/tasks/:taskId/complete')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async completeTask(
        @Param('id') instanceId: string,
        @Param('taskId') taskId: string,
        @Body() data: any
    ) {
        await this.prisma.workflowTaskInstance.update({
            where: { id: taskId },
            data: { input: JSON.stringify(data) }
        });
        await this.engineService.executeTask(taskId);
        return { success: true };
    }

    @Post(':id/pause')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async pause(@Param('id') id: string, @Body('userId') userId: string) {
        return this.engineService.pauseInstance(id, userId);
    }

    @Post(':id/resume')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async resume(@Param('id') id: string) {
        return this.engineService.resumeInstance(id);
    }

    @Post(':id/override')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async override(
        @Param('id') id: string,
        @Body() body: { targetStepId: string; userId: string; reason: string }
    ) {
        return this.engineService.overrideWorkflowStep(id, body.targetStepId, body.userId, body.reason);
    }
}
