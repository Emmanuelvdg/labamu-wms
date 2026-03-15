import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class CrossdockHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        return {
            status: 'COMPLETED',
            output: {
                crossDocked: true,
                destination: config.targetZone || 'SHIPPING_DOCK'
            }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
