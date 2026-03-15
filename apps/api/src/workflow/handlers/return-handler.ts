import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReturnHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['returnProcessed']) {
            return {
                status: 'COMPLETED',
                output: {
                    condition: inputData['itemCondition'],
                    restocked: inputData['restocked']
                }
            };
        }

        return {
            status: 'WAITING',
            output: { message: 'Awaiting return inspection and processing' }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
