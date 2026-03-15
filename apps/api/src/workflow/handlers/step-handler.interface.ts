import { Prisma } from '@prisma/client';

export type TaskWithStep = Prisma.WorkflowTaskInstanceGetPayload<{ include: { step: true, instance: true } }>;



export type StepResultStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'WAITING';

export interface StepResult {
    status: StepResultStatus;
    output?: any;
    errorMessage?: string;
    nextStepOverrideId?: string; // For branching (ConditionHandler)
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface IStepHandler {
    execute(task: TaskWithStep, context: any): Promise<StepResult>;
    validate(config: any): ValidationResult;
}
