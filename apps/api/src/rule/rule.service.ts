import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { ConditionHandler } from '../workflow/handlers/condition-handler';

@Injectable()
export class RuleService {
    private readonly logger = new Logger(RuleService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private workflowEngine: WorkflowEngineService,
        private conditionHandler: ConditionHandler,
    ) { }

    private async checkCrossDockOpportunity(
        productId: string,
        quantity: number,
        warehouseId: string,
    ): Promise<{ shouldCrossDock: boolean; stagingLocationId?: string; orderId?: string }> {
        // Find open outbound orders that need this product, have not been allocated,
        // and require no more units than what we have inbound (viable for full cross-dock)
        const urgentOrderItems = await this.prisma.orderItem.findMany({
            where: {
                productId,
                quantity: { lte: quantity },
                order: {
                    warehouseId,
                    status: { in: ['CONFIRMED', 'PROCESSING'] },
                    fulfillmentStatus: 'UNALLOCATED',
                },
            },
            include: { order: true },
            orderBy: { order: { createdAt: 'asc' } }, // FIFO
        });

        if (urgentOrderItems.length === 0) return { shouldCrossDock: false };

        // Find a cross-dock or staging location in this warehouse
        const stagingLocation = await this.prisma.location.findFirst({
            where: {
                warehouseId,
                OR: [
                    { type: 'CROSS_DOCK' },
                    { name: { contains: 'STAGING' } },
                    { name: { contains: 'Staging' } },
                ],
            },
        });

        if (!stagingLocation) return { shouldCrossDock: false };

        return {
            shouldCrossDock: true,
            stagingLocationId: stagingLocation.id,
            orderId: urgentOrderItems[0].orderId,
        };
    }

    async applyPushRules(productId: string, locationId: string, quantity: number, contextData: any = {}, visitedLocations: Set<string> = new Set()) {
        if (visitedLocations.has(locationId)) {
            this.logger.warn(`Cycle detected in PUSH rule chain at location ${locationId}. Aborting chain.`);
            return;
        }
        visitedLocations.add(locationId);

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
                
                // Construct a context payload for the workflow and pass it atomically
                const payload = { productId, locationId, quantity, ...contextData };

                await this.workflowEngine.startWorkflow(
                    matchingTemplate.id,
                    location.warehouseId,
                    contextData.orderId || productId,
                    matchingTemplate.triggerType,
                    payload
                );

                // Let the workflow handle all movements from here
                return;
            }
        }

        // Cross-dock check: only on inbound events when we know the warehouse
        if (!contextData.isOutbound && location?.warehouseId) {
            const crossDock = await this.checkCrossDockOpportunity(productId, quantity, location.warehouseId);
            if (crossDock.shouldCrossDock) {
                this.logger.log(`Cross-dock opportunity: routing ${productId} to staging for order ${crossDock.orderId}`);
                try {
                    await this.inventoryService.createTransfer({
                        productId,
                        sourceLocationId: locationId,
                        destinationLocationId: crossDock.stagingLocationId!,
                        quantity,
                        reason: `Cross-dock for order ${crossDock.orderId}`,
                    });
                } catch (error: any) {
                    this.logger.error(`Cross-dock transfer failed: ${error.message} — falling through to putaway rules`);
                }
                return;
            }
        }

        // Find active PUSH rules for this source location, scoped to the current trigger direction
        const currentTriggerType = contextData.isOutbound ? 'OUTBOUND' : 'INBOUND';
        const rules = await this.prisma.rule.findMany({
            where: {
                sourceLocationId: locationId,
                action: 'PUSH',
                OR: [
                    { triggerType: null },
                    { triggerType: currentTriggerType },
                ],
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

            // Evaluate per-rule conditions against the current context
            if (rule.conditions) {
                try {
                    const conditionJson = JSON.parse(rule.conditions);
                    if (!this.conditionHandler.evaluateCondition(conditionJson, contextData)) {
                        this.logger.log(`Rule ${rule.id} skipped: condition not met`);
                        continue;
                    }
                } catch {
                    this.logger.warn(`Rule ${rule.id} has invalid conditions JSON — skipping rule`);
                    continue;
                }
            }

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

                // Recursively apply rules at the new destination (chain)
                await this.applyPushRules(productId, rule.destinationLocationId, quantity, contextData, visitedLocations);

                // Full quantity moved — stop processing further rules for this location
                return;
            } catch (error: any) {
                this.logger.error(`Failed to apply rule ${rule.id}: ${error.message}`);
                // Transfer failed — try the next rule in sequence
            }
        }
    }
}
