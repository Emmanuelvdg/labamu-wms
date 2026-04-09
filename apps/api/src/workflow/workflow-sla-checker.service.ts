import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class WorkflowSlaCheckerService {
    private readonly logger = new Logger(WorkflowSlaCheckerService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) {}

    async checkOverdueTasks(): Promise<void> {
        const overdueTasks = await this.prisma.workflowTaskInstance.findMany({
            where: {
                status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
                dueAt: { lt: new Date() },
            },
            include: {
                instance: {
                    include: { template: true }
                },
                step: true,
                assignee: true,
            },
        });

        if (overdueTasks.length === 0) return;

        this.logger.warn(`SLA check: ${overdueTasks.length} overdue task(s) found`);

        for (const task of overdueTasks) {
            await this.notificationService.createNotification({
                type: 'WORKFLOW_TASK_SLA_BREACH',
                title: `SLA breach: ${task.step.name}`,
                body: `Task in workflow "${task.instance.template.name}" is overdue. Assigned: ${task.assignee?.email ?? 'Unassigned'}`,
                link: `/workflow-instances/${task.instanceId}`,
                metadata: {
                    taskId: task.id,
                    instanceId: task.instanceId,
                    stepId: task.stepId,
                    dueAt: task.dueAt,
                },
                userId: task.assigneeId ?? undefined,
            });

            await this.prisma.workflowAuditLog.create({
                data: {
                    instanceId: task.instanceId,
                    action: 'SLA_BREACH',
                    stepId: task.stepId,
                    details: JSON.stringify({ dueAt: task.dueAt, taskId: task.id }),
                },
            });
        }
    }
}
