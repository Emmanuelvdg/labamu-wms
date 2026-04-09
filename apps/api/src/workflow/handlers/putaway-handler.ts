import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult, TaskWithStep } from './step-handler.interface';

import { PutawayService } from '../../inventory/putaway.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PutawayHandler implements IStepHandler {
    constructor(
        private putawayService: PutawayService,
        private prisma: PrismaService
    ) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        // Usually putaway needs context like: productId, quantity, sourceLocationId
        // If not provided in input, try to extract from instance context
        const productId = inputData['productId'] || context['productId'];
        const quantity = inputData['quantity'] || context['quantity'];
        const sourceLocationId = inputData['sourceLocationId'] || context['sourceLocationId'];
        const orderId = context['triggerRef'];

        // When worker explicitly confirms putaway completion via task.input
        if (inputData['putawayConfirmed']) {
            if (!productId || !quantity || !sourceLocationId) {
                return {
                    status: 'FAILED',
                    errorMessage: 'Missing required putaway context (productId, quantity, sourceLocationId)'
                };
            }

            return {
                status: 'COMPLETED',
                output: {
                    putawayTaskId: inputData['putawayTaskId'],
                    destinationLocationId: inputData['destinationLocationId']
                }
            };
        }

        try {
            const warehouseId = task.instance.warehouseId;

            if (!productId || !quantity || !warehouseId) {
                return {
                    status: 'FAILED',
                    errorMessage: 'Missing required context: productId, quantity, or warehouseId'
                };
            }

            const packagingType = context['packagingType'] ?? config.packagingType ?? undefined;

            const suggestedLocation = await this.putawayService.findBestLocation(
                productId,
                quantity,
                warehouseId,
                sourceLocationId ?? undefined,
                packagingType
            );

            if (!suggestedLocation) {
                return { status: 'FAILED', errorMessage: 'No valid putaway location found matching rules' };
            }

            return {
                status: 'WAITING',
                output: {
                    suggestedLocationId: suggestedLocation.id,
                    suggestedLocationName: suggestedLocation.name,
                    message: 'Waiting for putaway confirmation'
                }
            };
        } catch (e: any) {
            return { status: 'FAILED', errorMessage: e.message };
        }
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
