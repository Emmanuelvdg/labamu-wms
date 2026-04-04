import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PICKING_SESSION_COMPLETED, PickingSessionCompletedEvent } from '../strategy/events/picking.events';
import { RuleService } from './rule.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OutboundRoutingListener {
    private readonly logger = new Logger(OutboundRoutingListener.name);

    constructor(
        private ruleService: RuleService,
        private workflowEngine: WorkflowEngineService,
        private prisma: PrismaService
    ) {}

    @OnEvent(PICKING_SESSION_COMPLETED)
    async handlePickingSessionCompleted(event: PickingSessionCompletedEvent) {
        this.logger.log(`Handling picking completion event for session ${event.sessionId}`);

        for (const orderId of event.orderIds) {
            try {
                // 1. Check if this session was launched as part of an active workflow task
                const pendingTask = await this.prisma.workflowTaskInstance.findFirst({
                    where: {
                        status: 'WAITING',
                        output: { contains: `"sessionId":"${event.sessionId}"` }
                    }
                });

                if (pendingTask) {
                    this.logger.log(`Advancing driving workflow task ${pendingTask.id} for session ${event.sessionId}`);
                    // Complete the task, passing the confirmed signal back
                    await this.prisma.workflowTaskInstance.update({
                        where: { id: pendingTask.id },
                        data: { input: JSON.stringify({ pickConfirmed: true, sessionId: event.sessionId }) }
                    });
                    
                    await this.workflowEngine.executeTask(pendingTask.id);
                    continue; // Handled by workflow, skip default routing
                }

                // 2. Default Routing: Dispatch post-pick rules for order
                this.logger.log(`Dispatching post-pick rules for order ${orderId}`);
                const orderTasks = event.tasks.filter(t => t.orderId === orderId);
                
                for (const task of orderTasks) {
                    await this.ruleService.applyPushRules(
                        task.productId,
                        task.sourceLocationId,
                        task.pickedQuantity || task.quantity,
                        { orderId, sessionId: event.sessionId, isOutbound: true }
                    );
                }
            } catch (error: any) {
                this.logger.error(`Failed to route order ${orderId} after picking: ${error.message}`);
            }
        }
    }
}
