
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReturnsService {
    private readonly logger = new Logger(ReturnsService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService
    ) { }

    async createReturnRequest(data: {
        originalOrderId: string;
        items: { productId: string; quantity: number; returnReason: string }[];
    }) {
        this.logger.log(`Creating Return Request for Order ${data.originalOrderId}`);

        // 1. Verify Original Order
        const order = await this.prisma.order.findUnique({
            where: { id: data.originalOrderId },
            include: { items: true, customer: true }
        });

        if (!order) throw new NotFoundException('Original Order not found');
        // Allow returns for SHIPPED, COMPLETED, or even DELIVERED (if tracked)
        // Adjust status check as needed. For now, just ensure it's not canceled? 
        if (order.status === 'CANCELLED') throw new BadRequestException('Cannot return items from a cancelled order');

        // 2. Validate Items & Quantities
        for (const returnItem of data.items) {
            const originalItem = order.items.find(i => i.productId === returnItem.productId);
            if (!originalItem) throw new BadRequestException(`Product ${returnItem.productId} not in original order`);
            if (returnItem.quantity > originalItem.quantity) throw new BadRequestException(`Cannot return more than purchased quantity for ${returnItem.productId}`);

            // Optional: Check if already returned? (Requires aggregating existing returns)
        }

        // 3. Create Return Order
        // Use 'RETURN' as type. Inherit customerId from original.
        // Destination Warehouse? Typically the one that shipped it, or a central return center.
        // For simplicity, stick to original warehouseId (if available) or Main.
        const returnOrder = await this.prisma.order.create({
            data: {
                type: 'RETURN',
                status: 'REQUESTED', // Workflow: REQUESTED -> RECEIVED -> COMPLETED
                priority: 'NORMAL',
                parentOrderId: order.id,
                warehouseId: order.warehouseId, // Sending back to origin warehouse
                // customerId: order.customerId, // Optional in refined schema
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        returnReason: item.returnReason,
                        condition: 'UNKNOWN' // Initial state
                    }))
                }
            } as any,
            include: { items: true }
        });

        return returnOrder;
    }

    async receiveReturn(returnId: string, data: {
        items: { productId: string; quantity: number; condition: string }[]
    }) {
        this.logger.log(`Receiving Return Order ${returnId}`);

        const returnOrder = await this.prisma.order.findUnique({
            where: { id: returnId },
            include: { items: true }
        });

        if (!returnOrder) throw new NotFoundException('Return Order not found');
        if (returnOrder.status === 'COMPLETED') throw new BadRequestException('Return is already processed');

        // 1. Process each item receipt
        for (const rxItem of data.items) {
            const ordItem = returnOrder.items.find(i => i.productId === rxItem.productId);
            if (!ordItem) continue;

            // Logic: Move stock
            // If condition == DAMAGED -> Quarantine
            // If condition == SELLABLE -> Regular Stock

            const targetWarehouseId = returnOrder.warehouseId;
            if (!targetWarehouseId) throw new BadRequestException('Return Order has no target warehouse');

            let locationId: string | null = null;

            if (rxItem.condition === 'DAMAGED') {
                locationId = await this.findOrCreateQuarantineLocation(targetWarehouseId);
            } else {
                locationId = await this.findReceivingLocation(targetWarehouseId);
            }

            if (!locationId) throw new BadRequestException(`Could not determine target location for condition: ${rxItem.condition}`);

            // Update Inventory (Increase)
            // Use InventoryService.adjustStock or manually? 
            // Better to use batch logic if possible, or simple adjustment.
            // Let's use direct DB for now to be explicit, but ideally InventoryService.addStock.

            // We need to link to specific location.
            // InventoryService might not expose location-specific add efficiently without 'Batch'.
            // Let's create a Batch (Return Batch)? Or just update ProductInventory?
            // ProductInventory is per-warehouse aggregate usually? 
            // Let's check schema for location-level inventory.
            // InventoryBatch is the way Labamu usually tracks detailed stock.
            // But we don't have a batchId for the return... Create new batch?
            // "RETURN-{Date}"

            await this.prisma.inventoryBatch.create({
                data: {
                    productId: rxItem.productId,
                    warehouseId: targetWarehouseId,
                    locationId: locationId,
                    // Use a unique batch number per line item/action
                    batchNumber: `RET-${returnOrder.id.substring(0, 5)}-${rxItem.productId.substring(0, 5)}-${Date.now()}`,
                    initialQuantity: rxItem.quantity,
                    currentQuantity: rxItem.quantity,
                    costPerUnit: 0, // Default for return
                    purchaseDate: new Date(),
                    status: 'Active',
                    expiryDate: null
                }
            });

            // Update Order Item condition to match received
            await this.prisma.orderItem.update({
                where: { id: ordItem.id },
                data: { condition: rxItem.condition }
            });
        }

        // 2. Complete Order
        await this.prisma.order.update({
            where: { id: returnId },
            data: { status: 'COMPLETED' }
        });

        return { success: true, message: 'Return processed and inventory updated' };
    }

    async listReturns(orderId?: string) {
        const where: any = { type: 'RETURN' };
        if (orderId) where.parentOrderId = orderId;
        return this.prisma.order.findMany({
            where,
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getReturn(id: string) {
        const ret = await this.prisma.order.findUnique({
            where: { id },
            include: { items: { include: { product: true } } },
        });
        if (!ret) throw new NotFoundException('Return not found');
        return ret;
    }

    async getReturnsByOrder(originalOrderId: string) {
        return this.prisma.order.findMany({
            where: { parentOrderId: originalOrderId, type: 'RETURN' },
            include: { items: true }
        });
    }

    // --- Helpers ---

    private async findOrCreateQuarantineLocation(warehouseId: string): Promise<string> {
        let loc = await this.prisma.location.findFirst({
            where: { warehouseId, type: 'QUARANTINE' }
        });

        if (!loc) {
            // Try by name
            loc = await this.prisma.location.findFirst({
                where: { warehouseId, name: { contains: 'Quarantine' } }
            });
        }

        if (!loc) {
            // Create "Returns Quarantine"
            loc = await this.prisma.location.create({
                data: {
                    warehouseId,
                    name: 'Returns Quarantine',
                    type: 'QUARANTINE',
                }
            });
        }
        return loc.id;
    }

    private async findReceivingLocation(warehouseId: string): Promise<string> {
        // Try to find a dock or general staging
        const loc = await this.prisma.location.findFirst({
            where: { warehouseId, type: 'INTERNAL' } // Simplistic
        });
        // Better: Find "Receiving Dock"
        const dock = await this.prisma.location.findFirst({
            where: { warehouseId, name: { contains: 'Receiving' } }
        });

        if (dock) return dock.id;
        if (loc) return loc.id;

        // Fallback: Just return the first location found?
        // Or create generic 'Receiving'
        const newDock = await this.prisma.location.create({
            data: {
                warehouseId,
                name: 'General Receiving',
                type: 'INTERNAL',
            }
        });
        return newDock.id;
    }
}
