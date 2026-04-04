import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';

@Injectable()
export class RuleService {
    private readonly logger = new Logger(RuleService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private workflowEngine: WorkflowEngineService
    ) { }

    async applyPushRules(productId: string, locationId: string, quantity: number, contextData: any = {}) {
        this.logger.log(`Checking PUSH rules for Product ${productId} at Location ${locationId}`);

        // 1. Check for modern multi-step Route Workflows first
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (location?.warehouseId) {
            const routeTemplates = await this.prisma.workflowTemplate.findMany({
                where: { 
                    OR: [
                        { warehouseId: location.warehouseId },
                        { warehouseId: null }
                    ],
                    triggerType: contextData.isOutbound ? 'OUTBOUND' : 'ROUTE', 
                    status: 'ACTIVE' 
                },
                include: { steps: true }
            });

            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: location.warehouseId },
                select: { incomingSteps: true, outgoingSteps: true }
            });

            // Find a template where the START step handles this location
            const potentialTemplates = routeTemplates.filter(t => {
                const startStep = t.steps.find(s => s.isStart);
                if (!startStep) return false;
                let config: any = {};
                try { config = JSON.parse(startStep.config); } catch (e) {}
                
                // Matches if step is purely bound to the location, or configured for any drop
                const matchesLocation = config.sourceLocationId === locationId || config.locationId === locationId;

                // For global templates, we allow a match if no location is specified
                if (!config.sourceLocationId && !config.locationId) {
                    return true;
                }

                return matchesLocation;
            });

            // Tie-break based on warehouse configuration
            const matchingTemplate = potentialTemplates.sort((a, b) => {
                const stepsSetting = contextData.isOutbound ? warehouse?.outgoingSteps : warehouse?.incomingSteps;
                if (!stepsSetting) return 0;
                
                const aMatches = a.name.toLowerCase().includes(stepsSetting.replace('_', '-'));
                const bMatches = b.name.toLowerCase().includes(stepsSetting.replace('_', '-'));
                
                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;
                return 0;
            })[0];

            if (matchingTemplate) {
                this.logger.log(`Dispatching multi-step Route Workflow: ${matchingTemplate.name}`);
                
                // Construct a context payload for the workflow
                const payload = { productId, locationId, quantity, ...contextData };
                
                const { instance } = await this.workflowEngine.startWorkflow(
                    matchingTemplate.id,
                    location.warehouseId,
                    contextData.orderId || productId,
                    matchingTemplate.triggerType
                );

                // Update context with payload so the first step can use it
                await this.prisma.workflowInstance.update({
                    where: { id: instance.id },
                    data: { context: JSON.stringify(payload) }
                });

                // Let the workflow handle all movements from here
                return;
            }
        }

        // Find active PUSH rules for this source location
        const rules = await this.prisma.rule.findMany({
            where: {
                sourceLocationId: locationId,
                action: 'PUSH',
            },
            orderBy: { sequence: 'asc' },
            include: { destinationLocation: true },
        });

        if (rules.length === 0) {
            this.logger.log('No PUSH rules found.');
            return;
        }

        for (const rule of rules) {
            if (!rule.destinationLocationId) continue;

            this.logger.log(`Applying Rule ${rule.id}: PUSH to ${rule.destinationLocation?.name}`);

            try {
                // Execute Transfer
                await this.inventoryService.createTransfer({
                    productId: productId,
                    sourceLocationId: locationId,
                    destinationLocationId: rule.destinationLocationId,
                    quantity: quantity,
                    reason: `Auto-Push Rule: ${rule.routeId || 'Default'}`,
                });

                this.logger.log(`Successfully pushed ${quantity} units to ${rule.destinationLocation?.name}`);

                // Recursively check for rules at the new destination (Chain)
                // Note: This assumes the transfer was immediate and successful.
                // In a real system, this might be async or event-driven.
                await this.applyPushRules(productId, rule.destinationLocationId, quantity);

            } catch (error: any) {
                this.logger.error(`Failed to apply rule ${rule.id}: ${error.message}`);
                // Don't stop other rules? Or stop? 
                // For now, log and continue, but usually stock is moved so we shouldn't apply multiple rules for SAME stock unless split.
                // Assuming 100% move for now.
                break; // Stop after successful move to avoid double moving if we assume full quantity move
            }
        }
    }
}
