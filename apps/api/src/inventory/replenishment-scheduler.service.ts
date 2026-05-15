import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { ReplenishmentService } from './replenishment.service';

@Injectable()
export class ReplenishmentSchedulerService {
    private readonly logger = new Logger(ReplenishmentSchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly replenishmentService: ReplenishmentService,
    ) { }

    /**
     * Runs every day at 06:00. For each warehouse with autoReplenishmentEnabled,
     * checks stock levels and optionally auto-creates POs for critical alerts.
     */
    @Cron('0 6 * * *')
    async runDailyStockCheck() {
        this.logger.log('Running scheduled replenishment stock check...');

        const warehouses = await this.prisma.warehouse.findMany({
            where: { autoReplenishmentEnabled: true },
            select: { id: true, name: true, companyId: true },
        });

        if (warehouses.length === 0) {
            this.logger.log('No warehouses have autoReplenishmentEnabled — skipping.');
            return;
        }

        for (const warehouse of warehouses) {
            try {
                const { newAlerts, alerts } = await this.replenishmentService.checkStockLevels(
                    warehouse.id,
                    warehouse.companyId ?? undefined,
                );
                this.logger.log(`Warehouse "${warehouse.name}": ${newAlerts} new alert(s).`);

                // Auto-create POs for CRITICAL_LOW alerts when enabled
                const criticalAlerts = alerts.filter((a: any) => a.type === 'CRITICAL_LOW');
                for (const alert of criticalAlerts) {
                    const result = await this.replenishmentService.autoCreatePurchaseOrder(alert.id);
                    if (result.success) {
                        this.logger.log(`Auto-created PO for product "${alert.product?.name}" in warehouse "${warehouse.name}".`);
                    } else {
                        this.logger.warn(`Could not auto-create PO for "${alert.product?.name}": ${result.error}`);
                    }
                }
            } catch (err: any) {
                this.logger.error(`Stock check failed for warehouse "${warehouse.name}": ${err.message}`);
            }
        }

        this.logger.log('Scheduled replenishment check complete.');
    }
}
