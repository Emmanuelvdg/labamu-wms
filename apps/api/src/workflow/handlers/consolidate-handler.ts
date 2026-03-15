import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class ConsolidateHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['consolidationComplete']) {
            return {
                status: 'COMPLETED',
                output: { consolidatedLocationId: inputData['consolidationLocationId'] }
            };
        }

        return {
            status: 'WAITING',
            output: {
                targetZone: config.consolidationZone || 'CONSOLIDATION_AREA',
                message: 'Awaiting item consolidation from multiple picks'
            }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
