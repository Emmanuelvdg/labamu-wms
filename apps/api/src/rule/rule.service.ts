import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class RuleService {
    private readonly logger = new Logger(RuleService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
    ) { }

    async applyPushRules(productId: string, locationId: string, quantity: number) {
        this.logger.log(`Checking PUSH rules for Product ${productId} at Location ${locationId}`);

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
