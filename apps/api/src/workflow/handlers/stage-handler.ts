import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class StageHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        // In 'STAGE' the item waits until an external event (like all items arriving) or timeout
        if (inputData['stageReleased']) {
            return { status: 'COMPLETED' };
        }

        return {
            status: 'WAITING',
            output: {
                stageZone: config.zoneId,
                holdTimeout: config.maxHoldMinutes
            }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
