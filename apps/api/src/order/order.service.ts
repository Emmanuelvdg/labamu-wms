import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StrategyService } from '../strategy/strategy.service';
import { InventoryService } from '../inventory/inventory.service';
import { Order } from '@labamu/database';

@Injectable()
export class OrderService {
    constructor(
        private prisma: PrismaService,
        private strategyService: StrategyService,
        private inventoryService: InventoryService,
    ) { }

    async createOrder(data: { customerId: string; priority: string; items: { productId: string; quantity: number }[] }): Promise<Order> {
        // 1. Create Order
        const order = await this.prisma.order.create({
            data: {
                customerId: data.customerId,
                priority: data.priority,
                status: 'PENDING',
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: { items: true },
        });

        // 2. Determine Strategies
        const pickingStrategy = await this.strategyService.evaluatePickingStrategy({
            priority: data.priority,
            itemCount: data.items.length,
            items: [], // Mock items for now
        });

        // 3. Reserve Stock (using FEFO/FIFO based on product type - simplified here)
        // In a real app, we'd check each product's perishability
        const reservationStrategy = 'FIFO';

        await this.inventoryService.reserveStock({
            orderId: order.id,
            items: data.items,
            strategy: reservationStrategy,
        });

        // 4. Update Order with Strategy info (mock update for now, or store in a separate table)
        // For now, just update status
        return this.prisma.order.update({
            where: { id: order.id },
            data: { status: 'RESERVED' },
            include: { items: true },
        });
    }

    async getOrders(): Promise<Order[]> {
        return this.prisma.order.findMany({
            include: { items: true, reservations: true, shipment: true },
        });
    }

    async createShipment(data: { orderId: string; carrier: string; trackingId: string }) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create Shipment
            const shipment = await tx.shipment.create({
                data: {
                    orderId: data.orderId,
                    carrier: data.carrier,
                    trackingId: data.trackingId,
                    status: 'SHIPPED',
                },
            });

            // 2. Update Order Status
            await tx.order.update({
                where: { id: data.orderId },
                data: { status: 'SHIPPED' },
            });

            // 3. Deduct Inventory (Commit Reservations)
            const reservations = await tx.reservation.findMany({
                where: { orderId: data.orderId },
            });

            for (const res of reservations) {
                // Find the specific inventory record (simplified logic: just find one with stock)
                // In a real app, we'd track exactly which inventory ID was reserved.
                // Here we just decrement from the product's aggregate or find a batch.

                // For now, let's update the ProductInventory to reduce quantity and reserved count
                // We need to find the inventory entries that were reserved.
                // Since our reservation model doesn't link to specific ProductInventory ID (it links to Product),
                // we have to do a best-effort deduction or assume we can find it.

                // Let's find any inventory for this product and deduct.
                const inventory = await tx.productInventory.findFirst({
                    where: { productId: res.productId, reserved: { gte: res.quantity } },
                });

                if (inventory) {
                    await tx.productInventory.update({
                        where: { id: inventory.id },
                        data: {
                            quantity: { decrement: res.quantity },
                            reserved: { decrement: res.quantity },
                        },
                    });
                }

                // Also log transaction
                await tx.stockTransaction.create({
                    data: {
                        productId: res.productId,
                        type: 'OUT',
                        quantity: res.quantity,
                        referenceId: data.orderId,
                        date: new Date(),
                    },
                });
            }

            return shipment;
        });
    }
}
