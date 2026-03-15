import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkflowValidationService {
    constructor(private prisma: PrismaService) { }

    async validateTemplate(templateId: string): Promise<{ valid: boolean; errors: string[] }> {
        const template = await this.prisma.workflowTemplate.findUnique({
            where: { id: templateId },
            include: { steps: true, transitions: true },
        });

        if (!template) {
            throw new BadRequestException('Template not found');
        }

        const { steps, transitions } = template;
        const errors: string[] = [];

        // 1. Exactly one start node
        const startSteps = steps.filter(s => s.isStart);
        if (startSteps.length === 0) {
            errors.push('Workflow must have at least one valid START step.');
        } else if (startSteps.length > 1) {
            errors.push('Workflow cannot have more than one START step.');
        }

        // 2. At least one end node
        const endSteps = steps.filter(s => s.isEnd);
        if (endSteps.length === 0) {
            errors.push('Workflow must have at least one END step.');
        }

        if (errors.length > 0) return { valid: false, errors };

        // 3. Graph traversal (BFS) to find orphans and dead ends
        const startStepId = startSteps[0].id;
        const visited = new Set<string>();
        const queue = [startStepId];

        // Track outgoing transitions count
        const outgoingCount = new Map<string, number>();
        for (const t of transitions) {
            outgoingCount.set(t.fromStepId, (outgoingCount.get(t.fromStepId) || 0) + 1);
        }

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (!visited.has(currentId)) {
                visited.add(currentId);

                const currentStep = steps.find(s => s.id === currentId);
                if (!currentStep) continue;

                const outTransitions = transitions.filter(t => t.fromStepId === currentId);

                // Check dead ends
                if (!currentStep.isEnd && outTransitions.length === 0) {
                    errors.push(`Step '${currentStep.name}' is a dead end (not an END node, but has no outgoing transitions).`);
                }

                // Check condition nodes
                if (currentStep.type === 'CONDITION' && outTransitions.length < 2) {
                    errors.push(`CONDITION step '${currentStep.name}' must have at least 2 outgoing transitions.`);
                }

                for (const out of outTransitions) {
                    queue.push(out.toStepId);
                }
            }
        }

        // Check for orphans
        for (const step of steps) {
            if (!visited.has(step.id)) {
                errors.push(`Step '${step.name}' is unreachable from the START step.`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
