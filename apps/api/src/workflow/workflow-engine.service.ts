import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IStepHandler, StepResult } from './handlers/step-handler.interface';
import { ConditionHandler } from './handlers/condition-handler';
import { ReceiveHandler } from './handlers/receive-handler';
import { PickHandler } from './handlers/pick-handler';
import { PutawayHandler } from './handlers/putaway-handler';
import { QcHandler } from './handlers/qc-handler';
import { StageHandler } from './handlers/stage-handler';
import { PackHandler } from './handlers/pack-handler';
import { CrossdockHandler } from './handlers/crossdock-handler';
import { ShipHandler } from './handlers/ship-handler';
import { ConsolidateHandler } from './handlers/consolidate-handler';
import { ReturnHandler } from './handlers/return-handler';
import { ReplenishHandler } from './handlers/replenish-handler';
import { ContextEnrichmentService } from './context-enrichment.service';

@Injectable()
export class WorkflowEngineService {
    private readonly logger = new Logger(WorkflowEngineService.name);
    private handlers: Map<string, IStepHandler> = new Map();

    constructor(
        private prisma: PrismaService,
        private conditionHandler: ConditionHandler,
        private receiveHandler: ReceiveHandler,
        private pickHandler: PickHandler,
        private putawayHandler: PutawayHandler,
        private qcHandler: QcHandler,
        private stageHandler: StageHandler,
        private packHandler: PackHandler,
        private crossdockHandler: CrossdockHandler,
        private shipHandler: ShipHandler,
        private consolidateHandler: ConsolidateHandler,
        private returnHandler: ReturnHandler,
        private replenishHandler: ReplenishHandler,
        private contextEnrichment: ContextEnrichmentService,
    ) {
        this.registerHandler('CONDITION', this.conditionHandler);
        this.registerHandler('RECEIVE', this.receiveHandler);
        this.registerHandler('WAVE_PICK', this.pickHandler);
        this.registerHandler('BATCH_PICK', this.pickHandler);
        this.registerHandler('ZONE_PICK', this.pickHandler);
        this.registerHandler('WAVELESS_PICK', this.pickHandler);
        this.registerHandler('SINGLE_PICK', this.pickHandler);
        this.registerHandler('PUTAWAY', this.putawayHandler);
        this.registerHandler('QC_INSPECT', this.qcHandler);
        this.registerHandler('STAGE', this.stageHandler);
        this.registerHandler('PACK', this.packHandler);
        this.registerHandler('CROSS_DOCK', this.crossdockHandler);
        this.registerHandler('SHIP', this.shipHandler);
        this.registerHandler('CONSOLIDATE', this.consolidateHandler);
        this.registerHandler('RETURN', this.returnHandler);
        this.registerHandler('REPLENISH', this.replenishHandler);
    }

    private registerHandler(type: string, handler: IStepHandler) {
        this.handlers.set(type, handler);
    }

    async startWorkflow(templateId: string, warehouseId: string, triggerRef?: string, triggerType?: string) {
        const template = await this.prisma.workflowTemplate.findUnique({
            where: { id: templateId },
            include: { steps: true }
        });

        if (!template) throw new NotFoundException('Template not found');

        const startStep = template.steps.find(s => s.isStart);
        if (!startStep) throw new BadRequestException('Workflow has no START step');

        return this.prisma.$transaction(async (tx) => {
            // Create Instance
            const instance = await tx.workflowInstance.create({
                data: {
                    templateId,
                    warehouseId,
                    triggerRef,
                    triggerType,
                    status: 'RUNNING',
                    currentStepId: startStep.id,
                    context: JSON.stringify({ triggerRef, triggerType })
                }
            });

            // Create first task
            const task = await tx.workflowTaskInstance.create({
                data: {
                    instanceId: instance.id,
                    stepId: startStep.id,
                    status: 'PENDING',
                }
            });

            await tx.workflowAuditLog.create({
                data: {
                    instanceId: instance.id,
                    action: 'WORKFLOW_STARTED',
                    stepId: startStep.id,
                    details: JSON.stringify({ triggerRef })
                }
            });

            return { instance, task };
        });
    }

    async advanceWorkflow(instanceId: string) {
        const instance = await this.prisma.workflowInstance.findUnique({
            where: { id: instanceId },
            include: { tasks: { orderBy: { startedAt: 'desc' }, take: 1 } }
        });

        if (!instance) throw new NotFoundException('Workflow instance not found');
        if (instance.status !== 'RUNNING') throw new BadRequestException(`Cannot advance a ${instance.status} workflow`);

        const currentTask = instance.tasks[0];
        if (!currentTask || currentTask.status === 'PENDING' || currentTask.status === 'IN_PROGRESS') {
            // The current task isn't done yet, cannot advance.
            this.logger.debug(`Workflow ${instanceId} waiting on task ${currentTask?.id}`);
            return;
        }

        if (currentTask.status === 'FAILED') {
            await this.prisma.workflowInstance.update({
                where: { id: instanceId },
                data: { status: 'FAILED' }
            });
            return;
        }

        // Task is COMPLETED. Find next step
        const transitions = await this.prisma.workflowTransition.findMany({
            where: { fromStepId: currentTask.stepId },
            orderBy: { order: 'asc' }
        });

        if (transitions.length === 0) {
            // End of workflow
            await this.prisma.workflowInstance.update({
                where: { id: instanceId },
                data: { status: 'COMPLETED', completedAt: new Date() }
            });
            return;
        }

        // Default simple transition logic (complex branching is done via ConditionHandler modifying nextStepOverrideId which theoretically could be captured in output)
        let nextStepId = transitions[0].toStepId;

        // Check if the previous task had an explicit next step override (e.g. from ConditionHandler)
        let outputData: any = {};
        if (currentTask.output) {
            try { outputData = JSON.parse(currentTask.output); } catch (e) { }
            if (outputData.nextStepOverrideId) {
                nextStepId = outputData.nextStepOverrideId;
            }
        }

        const nextStep = await this.prisma.workflowStep.findUnique({ where: { id: nextStepId } });

        // Create new task
        const newTask = await this.prisma.workflowTaskInstance.create({
            data: {
                instanceId: instance.id,
                stepId: nextStepId,
                status: 'PENDING',
            }
        });

        await this.prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { currentStepId: nextStepId }
        });

        await this.prisma.workflowAuditLog.create({
            data: {
                instanceId: instance.id,
                action: 'STEP_TRANSITIONED',
                stepId: nextStepId,
                details: JSON.stringify({ fromTask: currentTask.id, toTask: newTask.id })
            }
        });

        // If step is condition, evaluate immediately
        if (nextStep?.type === 'CONDITION') { // Condition nodes don't need real human work typically
            await this.executeTask(newTask.id);
        }
    }

    async executeTask(taskId: string) {
        const task = await this.prisma.workflowTaskInstance.findUnique({
            where: { id: taskId },
            include: {
                step: true,
                instance: true
            }
        });

        if (!task) throw new NotFoundException('Task not found');

        const handler = this.handlers.get(task.step.type);
        if (!handler) {
            throw new BadRequestException(`No handler registered for step type: ${task.step.type}`);
        }

        await this.prisma.workflowTaskInstance.update({
            where: { id: taskId },
            data: { status: 'IN_PROGRESS', startedAt: new Date() }
        });

        let contextData = {};
        try { contextData = JSON.parse(task.instance.context); } catch (e) { }

        // Enrich context dynamically before executing
        contextData = await this.contextEnrichment.enrichContext(
            task.instance.triggerType || undefined, 
            task.instance.triggerRef || undefined, 
            contextData
        );

        let result: StepResult;
        try {
            result = await handler.execute(task, contextData);
        } catch (error: any) {
            result = { status: 'FAILED', errorMessage: error.message };
        }

        const updateData: any = { status: result.status };
        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
            updateData.completedAt = new Date();
        }

        if (result.output || result.nextStepOverrideId) {
            updateData.output = JSON.stringify({
                ...result.output,
                nextStepOverrideId: result.nextStepOverrideId
            });
        }

        if (result.errorMessage) {
            updateData.errorMessage = result.errorMessage;
        }

        if (result.status === 'COMPLETED' && result.output) {
            const mergedContext = { ...contextData, ...result.output };
            await this.prisma.workflowInstance.update({
                where: { id: task.instanceId },
                data: { context: JSON.stringify(mergedContext) }
            });
        }

        await this.prisma.workflowTaskInstance.update({
            where: { id: taskId },
            data: updateData
        });

        await this.prisma.workflowAuditLog.create({
            data: {
                instanceId: task.instanceId,
                action: `TASK_${result.status}`,
                stepId: task.stepId,
                details: JSON.stringify({ output: result.output, error: result.errorMessage })
            }
        });

        if (result.status === 'COMPLETED') {
            // Try to advance workflow immediately
            await this.advanceWorkflow(task.instanceId);
        }
    }

    async pauseInstance(instanceId: string, userId: string) {
        return this.prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { status: 'PAUSED', pausedBy: userId }
        });
    }

    async resumeInstance(instanceId: string) {
        return this.prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { status: 'RUNNING', pausedBy: null }
        });
    }

    async overrideWorkflowStep(instanceId: string, targetStepId: string, userId: string, reason: string) {
        const instance = await this.prisma.workflowInstance.findUnique({
            where: { id: instanceId },
            include: { tasks: { orderBy: { startedAt: 'desc' }, take: 1 } }
        });

        if (!instance) throw new NotFoundException('Workflow instance not found');

        const currentTask = instance.tasks[0];
        
        // Mark current task as overruled/completed
        if (currentTask && (currentTask.status === 'PENDING' || currentTask.status === 'IN_PROGRESS' || currentTask.status === 'WAITING')) {
            await this.prisma.workflowTaskInstance.update({
                where: { id: currentTask.id },
                data: { 
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    errorMessage: `Overridden by supervisor: ${reason}` 
                }
            });
        }

        const targetStep = await this.prisma.workflowStep.findUnique({
            where: { id: targetStepId }
        });

        if (!targetStep) throw new BadRequestException(`Target step ${targetStepId} not found`);

        // Create new task for target step
        const newTask = await this.prisma.workflowTaskInstance.create({
            data: {
                instanceId: instance.id,
                stepId: targetStepId,
                status: 'PENDING',
            }
        });

        await this.prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { 
                currentStepId: targetStepId,
                status: 'RUNNING' // Ensure it's active
            }
        });

        await this.prisma.workflowAuditLog.create({
            data: {
                instanceId: instanceId,
                action: 'ACTION_OVERRIDE',
                stepId: targetStepId,
                userId: userId,
                details: JSON.stringify({ 
                    fromTask: currentTask?.id, 
                    toTask: newTask.id,
                    reason: reason 
                })
            }
        });

        // Trigger execution of the new task if needed
        await this.executeTask(newTask.id);

        return { success: true, newTask };
    }
}
