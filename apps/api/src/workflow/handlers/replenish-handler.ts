import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReplenishHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['replenishmentComplete']) {
            return { status: 'COMPLETED' };
        }

        return {
            status: 'WAITING',
            output: { message: 'Awaiting task completion for forward pick replenishment' }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
