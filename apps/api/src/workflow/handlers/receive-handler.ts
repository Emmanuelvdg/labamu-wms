import { Injectable } from '@nestjs/common';
import { IStepHandler, StepResult, ValidationResult , TaskWithStep } from './step-handler.interface';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReceiveHandler implements IStepHandler {
    constructor(private prisma: PrismaService) { }

    async execute(task: TaskWithStep, context: any): Promise<StepResult> {
        const config = typeof task.step.config === 'string' ? JSON.parse(task.step.config) : task.step.config;

        // In a real implementation, this would interact with PurchaseOrderService or InboundService
        // to actually create a receipt document or prompt the user for receiving quantities.
        // For this engine, we will output that a receipt task is pending user action.

        // Check if the input already contains receipt confirmation
        let inputData = {};
        if (task.input) {
            try { inputData = JSON.parse(task.input); } catch (e) { }
        }

        if (inputData['receiptConfirmed']) {
            const output: any = {
                receivedQuantity: inputData['receivedQuantity'],
                destinationLocationId: config.defaultReceivingLocationId || null
            };
            if (inputData['isCrossDock'] !== undefined) {
                output.isCrossDock = inputData['isCrossDock'];
            }
            return {
                status: 'COMPLETED',
                output
            };
        }

        // Wait for worker to scan and confirm receipt
        return { status: 'WAITING' };
    }

    validate(config: any): ValidationResult {
        return { valid: true, errors: [] };
    }
}
