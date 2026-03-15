import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class QcHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['qcResult']) {
            const passed = inputData['qcResult'] === 'PASS';
            return {
                status: passed ? 'COMPLETED' : 'FAILED',
                output: { passed, notes: inputData['notes'] },
                errorMessage: passed ? undefined : `QC Failed: ${inputData['notes']}`
            };
        }

        return {
            status: 'WAITING',
            output: {
                checklist: config.checklist || [],
                samplingRate: config.samplingRate || 100
            }
        };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
