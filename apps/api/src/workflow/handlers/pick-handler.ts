import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PickingStrategyService } from '../../strategy/picking-strategy.service';

@Injectable()
export class PickHandler implements IStepHandler {
    constructor(private pickingService: PickingStrategyService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;
        // strategy Type: BATCH, CLUSTER, WAVE, SINGLE, WAVELESS
        const strategy = config.strategyType || 'SINGLE';
        const orderId = context['triggerRef'];
        const warehouseId = task.instance.warehouseId;

        if (!orderId && strategy !== 'WAVELESS') {
            return { status: 'FAILED', errorMessage: 'Pick step requires an order context' };
        }

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['pickConfirmed']) {
            return {
                status: 'COMPLETED',
                output: { sessionId: inputData['sessionId'], message: 'Picking completed' }
            };
        }

        try {
            if (strategy === 'WAVELESS') {
                const session = await this.pickingService.createWavelessSession(warehouseId);
                return {
                    status: 'WAITING',
                    output: { sessionId: session.id, message: 'Waveless continuous queue active' }
                };
            }

            // Delegate session creation to picking service
            const session = await this.pickingService.createSession({
                warehouseId,
                strategy: strategy as any,
                criteria: config.criteria,
                maxOrders: config.maxOrders
            });

            return {
                status: 'WAITING',
                output: { sessionId: session.id, message: 'Picking session created' }
            };
        } catch (e: any) {
            return { status: 'FAILED', errorMessage: e.message };
        }
    }

    validate(config: any): ValidationResult {
        const errors = [];
        if (!config.strategyType) {
            errors.push('strategyType must be defined for Pick step');
        }
        return { valid: errors.length === 0, errors };
    }
}
