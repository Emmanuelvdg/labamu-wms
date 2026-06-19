import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class FulfillmentService {
    private readonly logger = new Logger(FulfillmentService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService
    ) { }

    async allocateOrder(orderId: string) {
        this.logger.log(`Allocating order ${orderId}...`);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, customer: true }
        });

        if (!order) { this.logger.error(`Order ${orderId} not found`); return; }
        if (order.warehouseId) { this.logger.log(`Order ${orderId} already assigned to ${order.warehouseId}`); return; }

        // 1. Get Active Rules (Route Engine)
        const rules = await this.prisma.fulfillmentRule.findMany({ where: { active: true }, orderBy: { priority: 'asc' }, include: { warehouse: true } });

        if (rules.length === 0) {
            this.logger.warn('No active fulfillment rules. Using default fallback.');
            return this.simpleScanFallback(order);
        }

        let bestWarehouseId: string | null = null;
        let requiresTransfer = false;
        let transferSourceConfig: any = null;

        // 2. Evaluate Rules (Interpreter Loop)
        for (const rule of rules) {
            this.logger.log(`Evaluating Rule: ${rule.name} (Strategy: ${rule.strategy}, Action: ${rule.actionIfUnavailable})`);

            let targetWarehouseId = rule.warehouseId;

            // Resolve Dynamic Targets
            if (rule.strategy === 'CLOSEST' && order.customer?.latitude) {
                targetWarehouseId = await this.findClosestWarehouseId(order.customer);
            } else if (rule.strategy === 'HIGHEST_STOCK') {
                targetWarehouseId = await this.findHighestStockWarehouseId(order.items);
            }

            if (!targetWarehouseId) continue;

            // Check Stock
            const hasStock = await this.checkStock(targetWarehouseId, order.items);

            if (hasStock) {
                // Success!
                bestWarehouseId = targetWarehouseId;
                break;
            } else {
                // Failure Handling
                if (rule.actionIfUnavailable === 'TRIGGER_TRANSFER') {
                    // Stop chaining, force assignment here, trigger IWT
                    bestWarehouseId = targetWarehouseId;
                    requiresTransfer = true;
                    transferSourceConfig = rule.transferSourceRule ? JSON.parse(rule.transferSourceRule) : null;
                    break;
                } else if (rule.actionIfUnavailable === 'BACKORDER') {
                    // Stop chaining, assign here, wait.
                    bestWarehouseId = targetWarehouseId;
                    break;
                }
                // If NEXT_RULE (default), continue loop
            }
        }

        // 3. Execution
        if (bestWarehouseId) {
            this.logger.log(`Allocating to ${bestWarehouseId} (Transfer Required: ${requiresTransfer})`);

            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    warehouseId: bestWarehouseId,
                    fulfillmentStatus: requiresTransfer ? 'PARTIAL' : 'ALLOCATED'
                }
            });

            if (requiresTransfer) {
                await this.handleDeficitsAndCreateIWT(orderId, bestWarehouseId, order.items, transferSourceConfig);
            }

        } else {
            this.logger.error('Allocation failed: No rules matched or all failed.');
            await this.prisma.order.update({ where: { id: orderId }, data: { fulfillmentStatus: 'UNALLOCATED' } });
        }
    }

    // Helper: Dynamic Source Finding for IWT
    private async handleDeficitsAndCreateIWT(orderId: string, destinationId: string, items: any[], config: any) {
        for (const item of items) {
            const localStock = await this.prisma.productInventory.findFirst({
                where: { warehouseId: destinationId, productId: item.productId }
            });
            const localAvailable = (localStock?.quantity || 0) - (localStock?.reserved || 0);

            if (localAvailable < item.quantity) {
                const deficit = item.quantity - localAvailable;

                // Find Source logic
                let sourceId: string | null = null;

                if (config && config.warehouseId) {
                    sourceId = config.warehouseId;
                } else {
                    // Default / Fallback: Find any with stock
                    const sources = await this.inventoryService.findProductStockLocations(item.productId);
                    const validSource = sources.find(s => s.warehouseId !== destinationId && s.available >= deficit);
                    sourceId = validSource?.warehouseId || null;
                }

                if (sourceId) {
                    this.logger.log(`Creating IWT from ${sourceId} to ${destinationId}`);
                    await this.createTransferRequest({
                        sourceWarehouseId: sourceId,
                        destinationWarehouseId: destinationId,
                        items: [{ productId: item.productId, quantity: deficit }],
                        initiatorId: 'system-auto-allocation',
                        parentOrderId: orderId
                    });
                } else {
                    this.logger.warn(`No valid IWT source found for ${item.productId}`);
                }
            }
        }
    }

    private async simpleScanFallback(order: any) {
        // Simple fallback: Check all warehouses, take first full match
        const warehouses = await this.prisma.warehouse.findMany();
        for (const w of warehouses) {
            if (await this.checkStock(w.id, order.items)) {
                await this.prisma.order.update({ where: { id: order.id }, data: { warehouseId: w.id, fulfillmentStatus: 'ALLOCATED' } });
                return;
            }
        }
    }

    // Helpers for dynamic resolution
    private async findClosestWarehouseId(customer: any): Promise<string | null> {
        const warehouses = await this.prisma.warehouse.findMany();
        if (!warehouses.length) return null;
        return warehouses.sort((a, b) => {
            const dA = this.calculateDistance(customer.latitude, customer.longitude, this.parseLocation(a.location).lat, this.parseLocation(a.location).lng);
            const dB = this.calculateDistance(customer.latitude, customer.longitude, this.parseLocation(b.location).lat, this.parseLocation(b.location).lng);
            return dA - dB;
        })[0].id;
    }

    private async findHighestStockWarehouseId(items: any[]): Promise<string | null> {
        // Iterate warehouses, sum stock for items, return max
        return null; // TODO: Implement if needed
    }

    private async checkStock(warehouseId: string, items: any[]): Promise<boolean> {
        for (const item of items) {
            const inventory = await this.prisma.productInventory.findFirst({
                where: {
                    warehouseId,
                    productId: item.productId
                }
            });
            const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);
            if (available < item.quantity) {
                return false;
            }
        }
        return true;
    }

    // --- Inter-Warehouse Transfers ---

    async createTransferRequest(data: {
        sourceWarehouseId: string;
        destinationWarehouseId: string;
        items: { productId: string; quantity: number }[];
        initiatorId: string;
        parentOrderId?: string;
    }) {
        // Use generic Order model for transfers
        return this.prisma.order.create({
            data: {
                type: 'TRANSFER',
                status: 'PENDING',
                priority: 'NORMAL',
                warehouseId: data.sourceWarehouseId, // Ship FROM source
                destinationWarehouseId: data.destinationWarehouseId, // Ship TO dest
                customerId: undefined, // generic system customer or empty
                parentOrderId: data.parentOrderId,

                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    }))
                }
            },
            include: { items: true }
        });
    }


    async approveTransfer(transferId: string, approverId: string) {
        const transfer = await this.prisma.order.update({
            where: { id: transferId },
            data: { status: 'APPROVED' },
            include: { items: true },
        });

        // Trigger a picking session at the source warehouse so pickers can
        // fulfill the transfer — this mirrors the outbound order flow.
        if (transfer.warehouseId && transfer.items?.length > 0) {
            try {
                await (this.prisma.pickingSession as any).create({
                    data: {
                        warehouseId: transfer.warehouseId,
                        userId: approverId,
                        strategy: 'SINGLE',
                        status: 'IN_PROGRESS',
                        orders: { connect: [{ id: transferId }] },
                    },
                });
                this.logger.log(`Picking session created for transfer ${transferId} at warehouse ${transfer.warehouseId}`);
            } catch (err: any) {
                // Non-critical — log but don't fail the approval
                this.logger.warn(`Could not auto-create picking session for transfer ${transferId}: ${err?.message}`);
            }
        }

        return transfer;
    }

    // --- Helpers ---

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private parseLocation(locationStr: string): { lat: number, lng: number } {
        try {
            return JSON.parse(locationStr);
        } catch (e) {
            return { lat: 0, lng: 0 };
        }
    }
}
