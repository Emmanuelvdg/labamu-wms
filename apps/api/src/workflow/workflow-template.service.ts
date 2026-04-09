import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkflowValidationService } from './workflow-validation.service';

@Injectable()
export class WorkflowTemplateService {
    constructor(
        private prisma: PrismaService,
        private validationService: WorkflowValidationService
    ) { }

    async findAll() {
        return this.prisma.workflowTemplate.findMany({
            orderBy: { updatedAt: 'desc' }
        });
    }

    async findOne(id: string) {
        const template = await this.prisma.workflowTemplate.findUnique({
            where: { id },
            include: {
                steps: true,
                transitions: true
            }
        });
        if (!template) throw new NotFoundException('Template not found');
        return template;
    }

    async create(data: { name: string; description?: string; triggerType?: string; warehouseId?: string; config?: any }) {
        return this.prisma.workflowTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                triggerType: data.triggerType || 'MANUAL',
                warehouseId: data.warehouseId,
                config: JSON.stringify(data.config || {})
            }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Update template properties
            const template = await tx.workflowTemplate.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    triggerType: data.triggerType,
                    config: data.config ? (typeof data.config === 'string' ? data.config : JSON.stringify(data.config)) : undefined
                }
            });

            // 2. Differential sync of steps and transitions if provided
            if (data.steps && data.transitions) {
                // Get existing steps to identify what to delete/update
                const existingSteps = await tx.workflowStep.findMany({
                    where: { templateId: id }
                });
                const existingStepIds = existingSteps.map(s => s.id);

                // Identify steps from input
                // Note: Frontend might send new steps with IDs like 'new-123'
                const incomingStepsWithIds = data.steps.filter(s => s.id && !s.id.startsWith('new-'));
                const incomingStepIds = incomingStepsWithIds.map(s => s.id);

                // A. Delete steps that are truly gone, but only if they have no execution history
                const stepIdsToDelete = existingStepIds.filter(sid => !incomingStepIds.includes(sid));
                for (const sid of stepIdsToDelete) {
                    const taskCount = await tx.workflowTaskInstance.count({ where: { stepId: sid } });
                    if (taskCount > 0) {
                        const step = existingSteps.find(s => s.id === sid);
                        throw new BadRequestException(
                            `Cannot delete step "${step?.name || sid}" because it has historical execution data. ` +
                            `Please keep the step or archive this workflow version and create a new one.`
                        );
                    }
                    await tx.workflowStep.delete({ where: { id: sid } });
                }

                // B. Map for frontend IDs to new/actual UUIDs (for transitions)
                const stepIdMap = new Map<string, string>(); // inputId -> databaseId

                // C. Update existing and create new steps
                for (const step of data.steps) {
                    const isExisting = step.id && !step.id.startsWith('new-') && existingStepIds.includes(step.id);

                    if (isExisting) {
                        // Update existing step
                        const updatedStep = await tx.workflowStep.update({
                            where: { id: step.id },
                            data: {
                                type: step.type,
                                name: step.name,
                                config: typeof step.config === 'string' ? step.config : JSON.stringify(step.config || {}),
                                positionX: step.positionX || 0,
                                positionY: step.positionY || 0,
                                isStart: step.isStart || false,
                                isEnd: step.isEnd || false,
                                order: step.order || 0
                            }
                        });
                        stepIdMap.set(step.id, updatedStep.id);
                    } else {
                        // Create new step
                        const newStep = await tx.workflowStep.create({
                            data: {
                                templateId: id,
                                type: step.type,
                                name: step.name,
                                config: typeof step.config === 'string' ? step.config : JSON.stringify(step.config || {}),
                                positionX: step.positionX || 0,
                                positionY: step.positionY || 0,
                                isStart: step.isStart || false,
                                isEnd: step.isEnd || false,
                                order: step.order || 0
                            }
                        });
                        stepIdMap.set(step.id || step.tempId, newStep.id);
                    }
                }

                // D. Full replace of transitions (safe because they don't have task-level FK dependencies)
                await tx.workflowTransition.deleteMany({ where: { templateId: id } });

                // Create new transitions using mapped IDs
                for (const trans of data.transitions) {
                    const fromId = stepIdMap.get(trans.fromStepId);
                    const toId = stepIdMap.get(trans.toStepId);
                    if (fromId && toId) {
                        await tx.workflowTransition.create({
                            data: {
                                templateId: id,
                                fromStepId: fromId,
                                toStepId: toId,
                                condition: trans.condition ? (typeof trans.condition === 'string' ? trans.condition : JSON.stringify(trans.condition)) : '{}',
                                label: trans.label,
                                order: trans.order || 0
                            }
                        });
                    }
                }
            }

            return template;
        });
    }

    async clone(id: string) {
        const original = await this.findOne(id);

        return this.prisma.$transaction(async (tx) => {
            const cloned = await tx.workflowTemplate.create({
                data: {
                    name: `${original.name} (Copy)`,
                    description: original.description,
                    triggerType: original.triggerType,
                    warehouseId: original.warehouseId,
                    config: original.config,
                    version: 1,
                    status: 'DRAFT'
                }
            });

            const stepIdMap = new Map<string, string>();

            for (const step of original.steps) {
                const newStep = await tx.workflowStep.create({
                    data: {
                        templateId: cloned.id,
                        type: step.type,
                        name: step.name,
                        config: step.config,
                        positionX: step.positionX,
                        positionY: step.positionY,
                        isStart: step.isStart,
                        isEnd: step.isEnd,
                        order: step.order
                    }
                });
                stepIdMap.set(step.id, newStep.id);
            }

            for (const trans of original.transitions) {
                await tx.workflowTransition.create({
                    data: {
                        templateId: cloned.id,
                        fromStepId: stepIdMap.get(trans.fromStepId)!,
                        toStepId: stepIdMap.get(trans.toStepId)!,
                        condition: trans.condition,
                        label: trans.label,
                        order: trans.order
                    }
                });
            }

            return cloned;
        });
    }

    async createVersion(id: string) {
        const original = await this.findOne(id);

        // Find highest version
        const templates = await this.prisma.workflowTemplate.findMany({
            where: { name: original.name }
        });
        const maxVersion = Math.max(...templates.map(t => t.version));

        return this.prisma.$transaction(async (tx) => {
            const newVersion = await tx.workflowTemplate.create({
                data: {
                    name: original.name,
                    description: original.description,
                    triggerType: original.triggerType,
                    warehouseId: original.warehouseId,
                    config: original.config,
                    version: maxVersion + 1,
                    status: 'DRAFT'
                }
            });

            const stepIdMap = new Map<string, string>();
            for (const step of original.steps) {
                const newStep = await tx.workflowStep.create({
                    data: {
                        templateId: newVersion.id,
                        type: step.type,
                        name: step.name,
                        config: step.config,
                        positionX: step.positionX,
                        positionY: step.positionY,
                        isStart: step.isStart,
                        isEnd: step.isEnd,
                        order: step.order
                    }
                });
                stepIdMap.set(step.id, newStep.id);
            }

            for (const trans of original.transitions) {
                await tx.workflowTransition.create({
                    data: {
                        templateId: newVersion.id,
                        fromStepId: stepIdMap.get(trans.fromStepId)!,
                        toStepId: stepIdMap.get(trans.toStepId)!,
                        condition: trans.condition,
                        label: trans.label,
                        order: trans.order
                    }
                });
            }

            return newVersion;
        });
    }

    async activate(id: string) {
        const validation = await this.validationService.validateTemplate(id);
        if (!validation.valid) {
            throw new BadRequestException('Cannot activate invalid workflow. Errors: ' + validation.errors.join(', '));
        }

        return this.prisma.workflowTemplate.update({
            where: { id },
            data: { status: 'ACTIVE' }
        });
    }

    async archive(id: string) {
        return this.prisma.workflowTemplate.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });
    }
}
