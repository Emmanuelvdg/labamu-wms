import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class ContextEnrichmentService {
    private readonly logger = new Logger(ContextEnrichmentService.name);

    constructor(private prisma: PrismaService) {}

    async enrichContext(triggerType: string | undefined, triggerRef: string | undefined, baseContext: any): Promise<any> {
        const enriched = { ...baseContext };

        if (!triggerRef) {
            return enriched;
        }

        // Handle Order Context enriching (Sales/Outbound)
        if (triggerType === 'OUTBOUND' || triggerType === 'ORDER') {
            try {
                const order = await this.prisma.order.findUnique({
                    where: { id: triggerRef },
                    include: {
                        customer: true,
                        items: {
                            include: { product: true }
                        }
                    }
                });

                if (order) {
                    enriched.isHighValueOrder = order.totalAmount > 1000;
                    enriched.priority = order.priority;
                    enriched.shippingCarrier = order.shippingCarrier;
                    enriched.customerType = 'STANDARD';
                    
                    enriched.containsHazardousMaterial = order.items.some(
                        (i: any) => i.product?.attributes === 'HAZMAT' || i.product?.type === 'HAZMAT'
                    );

                    if (order.expectedDate) {
                        enriched.minutesUntilCutoff = differenceInMinutes(new Date(order.expectedDate), new Date());
                    } else {
                        enriched.minutesUntilCutoff = 9999;
                    }
                }
            } catch (error: any) {
                this.logger.error(`Failed to enrich order context for ${triggerRef}:`, error);
            }
        }

        // Handle Inbound Context (PO/Receipt)
        if (triggerType === 'ROUTE') {
             // Future: Enrich with PO/Receipt data if needed
             // For now, just ensure it doesn't try to find it in the Order table
        }

        // Additional trigger types (INBOUND, PO, etc.) can go here...
        return enriched;
    }
}
