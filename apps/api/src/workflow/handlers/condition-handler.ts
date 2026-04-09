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

    /**
     * Evaluate a condition expression against a context object.
     *
     * Supports compound logic:
     *   { and: [...] }  — all sub-conditions must be true
     *   { or:  [...] }  — at least one sub-condition must be true
     *   { not: {...}  } — inverts the sub-condition
     *
     * Leaf format (backwards-compatible):
     *   { field: 'priority', op: 'eq', value: 'URGENT' }
     *   Dot-notation supported: { field: 'order.customerType', op: 'eq', value: 'VIP' }
     */
    evaluateCondition(condition: any, context: any): boolean {
        if (condition.and && Array.isArray(condition.and)) {
            return condition.and.every((c: any) => this.evaluateCondition(c, context));
        }
        if (condition.or && Array.isArray(condition.or)) {
            return condition.or.some((c: any) => this.evaluateCondition(c, context));
        }
        if (condition.not) {
            return !this.evaluateCondition(condition.not, context);
        }
        return this.evaluateLeaf(condition, context);
    }

    private evaluateLeaf(condition: any, context: any): boolean {
        if (!condition.field || !condition.op) return false;

        // Resolve dot-notation path against context
        const fieldParts = condition.field.split('.');
        let actualValue = context;
        for (const part of fieldParts) {
            if (actualValue === undefined || actualValue === null) break;
            actualValue = actualValue[part];
        }

        switch (condition.op) {
            case 'eq':  return actualValue === condition.value;
            case 'neq': return actualValue !== condition.value;
            case 'gt':  return actualValue > condition.value;
            case 'lt':  return actualValue < condition.value;
            case 'gte': return actualValue >= condition.value;
            case 'lte': return actualValue <= condition.value;
            case 'in':  return Array.isArray(condition.value) && condition.value.includes(actualValue);
            case 'nin': return Array.isArray(condition.value) && !condition.value.includes(actualValue);
            default:    return false;
        }
    }
}
