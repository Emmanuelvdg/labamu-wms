import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RuleService } from './rule.service';
import { ReceiptCompletedEvent } from '../inventory/events/inbound.events';

@Injectable()
export class InboundRoutingListener {
    private readonly logger = new Logger(InboundRoutingListener.name);

    constructor(private readonly ruleService: RuleService) {}

    @OnEvent('receipt.completed')
    async handleReceiptCompleted(event: ReceiptCompletedEvent) {
        console.log(`[InboundRoutingListener] Received receipt.completed for Receipt ${event.receiptId}`);
        this.logger.log(`Handling receipt.completed for Receipt ${event.receiptId}`);

        try {
            for (const item of event.items) {
                this.logger.log(`Dispatching putaway/route rules for Product ${item.productId} at ${item.locationId}`);
                
                await this.ruleService.applyPushRules(
                    item.productId,
                    item.locationId,
                    item.quantity,
                    { 
                        receiptId: event.receiptId, 
                        purchaseOrderId: event.purchaseOrderId,
                        isOutbound: false 
                    }
                );
            }
        } catch (error: any) {
            this.logger.error(`Failed to process inbound routing for receipt ${event.receiptId}: ${error.message}`);
        }
    }
}
