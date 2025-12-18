import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class FulfillmentService {
    private readonly logger = new Logger(FulfillmentService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
    ) { }

    // --- Order Allocation ---

    async allocateOrder(orderId: string) {
        this.logger.log(`Allocating order ${orderId}...`);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!order) {
            this.logger.error(`Order ${orderId} not found`);
            return;
        }

        if (order.warehouseId) {
            this.logger.log(`Order ${orderId} already assigned to warehouse ${order.warehouseId}`);
            return;
        }

        // 1. Get Active Rules
        const rules = await this.prisma.fulfillmentRule.findMany({
            where: { active: true },
            orderBy: { priority: 'asc' }
        });

        if (rules.length === 0) {
            this.logger.warn('No active fulfillment rules found. Defaulting to PRIMARY or ANY.');
            // Fallback logic could go here
        }

        let bestWarehouseId: string | null = null;

        // 2. Evaluate Rules
        for (const rule of rules) {
            this.logger.log(`Evaluating rule: ${rule.name} (${rule.strategy})`);

            if (rule.strategy === 'PRIMARY' && rule.warehouseId) {
                // Check if Primary has stock
                const hasStock = await this.checkStock(rule.warehouseId, order.items);
                if (hasStock) {
                    bestWarehouseId = rule.warehouseId;
                    break;
                }
            } else if (rule.strategy === 'CLOSEST' && order.customer?.latitude && order.customer?.longitude) {
                const warehouses = await this.prisma.warehouse.findMany();
                // Calculate distances
                const sortedWarehouses = warehouses.map(w => {
                    const dist = this.calculateDistance(
                        order.customer!.latitude!,
                        order.customer!.longitude!,
                        this.parseLocation(w.location).lat,
                        this.parseLocation(w.location).lng
                    );
                    return { ...w, distance: dist };
                }).sort((a, b) => a.distance - b.distance);

                for (const w of sortedWarehouses) {
                    const hasStock = await this.checkStock(w.id, order.items);
                    if (hasStock) {
                        bestWarehouseId = w.id;
                        break;
                    }
                }
                if (bestWarehouseId) break;

            } else if (rule.strategy === 'HIGHEST_STOCK') {
                // Simplified: Find warehouse with most items available
                // For now, just check if any has ALL items
                const warehouses = await this.prisma.warehouse.findMany();
                for (const w of warehouses) {
                    const hasStock = await this.checkStock(w.id, order.items);
                    if (hasStock) {
                        bestWarehouseId = w.id;
                        break;
                    }
                }
                if (bestWarehouseId) break;
            }
        }

        // 3. Assign Warehouse or Create Transfer
        if (bestWarehouseId) {
            this.logger.log(`Allocating order to warehouse ${bestWarehouseId}`);
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    warehouseId: bestWarehouseId,
                    fulfillmentStatus: 'ALLOCATED'
                }
            });
        } else {
            this.logger.warn(`Could not find a single warehouse with full stock for order ${orderId}`);
            // Logic for IWT would go here:
            // 1. Pick a destination (e.g. Closest)
            // 2. Find missing items in other warehouses
            // 3. Create TransferOrder

            // For MVP, let's just assign to the Closest (or first) and mark as PARTIAL/UNALLOCATED
            // and let the user manually handle transfers for now, or implement basic IWT

            await this.prisma.order.update({
                where: { id: orderId },
                data: { fulfillmentStatus: 'UNALLOCATED' }
            });
        }
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
    }) {
        const initiator = await this.prisma.user.findUnique({
            where: { id: data.initiatorId },
            include: { roles: true }
        });

        const hasPrivilegedRole = initiator?.roles?.some(role =>
            ['MANAGER', 'ADMIN'].includes(role.name.toUpperCase())
        );
        const status = hasPrivilegedRole ? 'APPROVED' : 'PENDING_APPROVAL';

        return this.prisma.transferOrder.create({
            data: {
                sourceWarehouseId: data.sourceWarehouseId,
                destinationWarehouseId: data.destinationWarehouseId,
                initiatorId: data.initiatorId,
                status,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            },
            include: { items: true }
        });
    }

    async approveTransfer(transferId: string, approverId: string) {
        return this.prisma.transferOrder.update({
            where: { id: transferId },
            data: {
                status: 'APPROVED',
                approverId
            }
        });
        // TODO: Trigger Picking Session at Source
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
