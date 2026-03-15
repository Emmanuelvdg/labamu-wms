import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class PackHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['packingConfirmed']) {
            return {
                status: 'COMPLETED',
                output: { trackingNumber: inputData['trackingNumber'], parcelIds: inputData['parcelIds'] }
            };
        }

        return {
            status: 'WAITING',
            output: { message: 'Awaiting packing session completion' }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
