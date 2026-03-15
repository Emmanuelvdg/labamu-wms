import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ConditionHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        // Evaluate transitions from this step
        const transitions = await this.prisma.workflowTransition.findMany({
            where: { fromStepId: task.stepId },
            orderBy: { order: 'asc' }
        });

        for (const trans of transitions) {
            if (!trans.condition || trans.condition === '{}') {
                // Default / Fallback transition
                return { status: 'COMPLETED', nextStepOverrideId: trans.toStepId };
            }

            const condition = typeof trans.condition === 'string' ? JSON.parse(trans.condition) : trans.condition;

            try {
                if (this.evaluateCondition(condition, context)) {
                    return { status: 'COMPLETED', nextStepOverrideId: trans.toStepId };
                }
            } catch (err: any) {
                return { status: 'FAILED', errorMessage: `Condition eval error: ${err.message}` };
            }
        }

        return { status: 'FAILED', errorMessage: 'No conditions met and no fallback transition found.' };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] }; // Validation done at transition level
    }

    private evaluateCondition(condition: any, context: any): boolean {
        // Simple expression evaluator
        // Format: { field: 'context.priority', op: 'eq', value: 'URGENT' }
        if (!condition.field || !condition.op) return false;

        // Resolve dot notation for field
        const fieldParts = condition.field.split('.');
        let actualValue = context;
        for (const part of fieldParts) {
            if (actualValue === undefined) break;
            actualValue = actualValue[part];
        }

        switch (condition.op) {
            case 'eq': return actualValue === condition.value;
            case 'neq': return actualValue !== condition.value;
            case 'gt': return actualValue > condition.value;
            case 'lt': return actualValue < condition.value;
            case 'gte': return actualValue >= condition.value;
            case 'lte': return actualValue <= condition.value;
            case 'in': return Array.isArray(condition.value) && condition.value.includes(actualValue);
            case 'nin': return Array.isArray(condition.value) && !condition.value.includes(actualValue);
            default: return false;
        }
    }
}
