import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReplenishmentService {
    private readonly logger = new Logger(ReplenishmentService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Check stock levels for all products and generate alerts for those below reorder point.
     */
    async checkStockLevels(warehouseId?: string) {
        // Get all products with reorder points defined
        const products = await this.prisma.product.findMany({
            where: {
                reorderPoint: { not: null },
                isStockable: true,
            },
            include: {
                inventory: warehouseId ? { where: { warehouseId } } : true,
            },
        });

        const alerts: any[] = [];

        for (const product of products) {
            const totalQty = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

            if (product.reorderPoint !== null && totalQty <= product.reorderPoint) {
                // Check if an active alert already exists
                const existing = await this.prisma.replenishmentAlert.findFirst({
                    where: {
                        productId: product.id,
                        status: 'ACTIVE',
                        ...(warehouseId ? { warehouseId } : {}),
                    },
                });

                if (!existing) {
                    const alert = await this.prisma.replenishmentAlert.create({
                        data: {
                            productId: product.id,
                            warehouseId: warehouseId || null,
                            type: totalQty <= (product.safetyStock || 0) ? 'CRITICAL_LOW' : 'LOW_STOCK',
                            currentQty: totalQty,
                            threshold: product.reorderPoint,
                            status: 'ACTIVE',
                        },
                        include: { product: true, warehouse: true },
                    });
                    alerts.push(alert);
                } else {
                    // Update the existing alert's current quantity
                    await this.prisma.replenishmentAlert.update({
                        where: { id: existing.id },
                        data: {
                            currentQty: totalQty,
                            type: totalQty <= (product.safetyStock || 0) ? 'CRITICAL_LOW' : 'LOW_STOCK',
                        },
                    });
                }
            }
        }

        this.logger.log(`Stock check complete. ${alerts.length} new alerts generated.`);
        return { newAlerts: alerts.length, alerts };
    }

    /**
     * Get all replenishment alerts.
     */
    async getAlerts(filters?: { warehouseId?: string; status?: string; type?: string }) {
        const where: any = {};
        if (filters?.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters?.status) where.status = filters.status;
        if (filters?.type) where.type = filters.type;

        return this.prisma.replenishmentAlert.findMany({
            where,
            include: { product: true, warehouse: true },
            orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Auto-create a purchase order from a replenishment alert.
     */
    async autoCreatePurchaseOrder(alertId: string) {
        const alert = await this.prisma.replenishmentAlert.findUnique({
            where: { id: alertId },
            include: { product: true },
        });
        if (!alert) throw new NotFoundException('Alert not found');

        const product = alert.product;
        const orderQty = product.reorderQuantity || (product.reorderPoint || 10) * 2;

        // Find the preferred supplier
        const supplierId = product.supplierId;
        if (!supplierId) {
            this.logger.warn(`Product ${product.name} has no supplierId, cannot auto-create PO`);
            return { success: false, error: 'No supplier configured for this product' };
        }

        // Create a draft PO
        const po = await this.prisma.purchaseOrder.create({
            data: {
                supplierId,
                status: 'DRAFT',
                expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                items: {
                    create: [{
                        productId: product.id,
                        quantity: orderQty,
                        unitCost: product.averageCost || 0,
                    }],
                },
                notes: `Auto-generated from replenishment alert. Current stock: ${alert.currentQty}, Reorder point: ${alert.threshold}`,
            },
            include: { items: true, supplier: true },
        });

        // Mark alert as addressed
        await this.prisma.replenishmentAlert.update({
            where: { id: alertId },
            data: { status: 'PO_CREATED' },
        });

        this.logger.log(`Auto-created PO ${po.id} for ${product.name}: ${orderQty} units`);
        return { success: true, purchaseOrder: po };
    }

    /**
     * Dismiss an alert (manual override).
     */
    async dismissAlert(alertId: string) {
        return this.prisma.replenishmentAlert.update({
            where: { id: alertId },
            data: { status: 'DISMISSED' },
        });
    }

    /**
     * Get replenishment summary stats.
     */
    async getSummary(warehouseId?: string) {
        const where: any = { status: 'ACTIVE' };
        if (warehouseId) where.warehouseId = warehouseId;

        const [totalActive, criticalCount, lowStockCount] = await Promise.all([
            this.prisma.replenishmentAlert.count({ where }),
            this.prisma.replenishmentAlert.count({ where: { ...where, type: 'CRITICAL_LOW' } }),
            this.prisma.replenishmentAlert.count({ where: { ...where, type: 'LOW_STOCK' } }),
        ]);

        return { totalActive, criticalCount, lowStockCount };
    }
}
