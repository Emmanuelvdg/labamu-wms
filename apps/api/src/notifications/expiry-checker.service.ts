import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ExpiryCheckerService {
    private readonly logger = new Logger(ExpiryCheckerService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    /**
     * Check for batches expiring within the given number of days.
     * Creates EXPIRY_WARNING notifications for each.
     */
    async checkExpiringBatches(daysThreshold = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

        const expiringBatches = await this.prisma.inventoryBatch.findMany({
            where: {
                expiryDate: {
                    not: null,
                    lte: thresholdDate,
                    gte: new Date(), // not already expired (or include expired too)
                },
                currentQuantity: { gt: 0 },
            },
            include: {
                product: true,
                warehouse: true,
                location: true,
            },
        });

        const notifications: any[] = [];

        for (const batch of expiringBatches) {
            const daysUntilExpiry = Math.ceil(
                ((batch.expiryDate as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            const notification = await this.notificationService.createNotification({
                type: 'EXPIRY_WARNING',
                title: `Batch expiring in ${daysUntilExpiry} days`,
                body: `${batch.product.name} (${batch.product.sku}) – Batch ${batch.batchNumber || batch.id.substring(0, 8)} – ${batch.currentQuantity} units expiring on ${(batch.expiryDate as Date).toLocaleDateString()}`,
                link: `/inventory/batches`,
                metadata: {
                    batchId: batch.id,
                    productId: batch.productId,
                    warehouseId: batch.warehouseId,
                    daysUntilExpiry,
                },
            });

            notifications.push(notification);
        }

        this.logger.log(`Expiry check: ${expiringBatches.length} batches found, ${notifications.length} notifications created`);

        return {
            batchesChecked: expiringBatches.length,
            notificationsCreated: notifications.length,
            notifications,
        };
    }

    /**
     * Check for already expired batches with stock.
     */
    async checkExpiredBatches() {
        const expiredBatches = await this.prisma.inventoryBatch.findMany({
            where: {
                expiryDate: { lt: new Date() },
                currentQuantity: { gt: 0 },
            },
            include: { product: true, warehouse: true },
        });

        for (const batch of expiredBatches) {
            await this.notificationService.createNotification({
                type: 'EXPIRED_STOCK',
                title: `Expired stock detected`,
                body: `${batch.product.name} (${batch.product.sku}) – ${batch.currentQuantity} units have expired. Consider scrapping or quarantining.`,
                link: `/inventory/batches`,
                metadata: { batchId: batch.id, productId: batch.productId },
            });
        }

        return { expired: expiredBatches.length };
    }
}
