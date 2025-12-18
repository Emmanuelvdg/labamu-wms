import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StrategyService } from '../strategy/strategy.service';
import { InventoryService } from '../inventory/inventory.service';
import { Order } from '@labamu/database';

import * as fs from 'fs';
import * as path from 'path';

import { FulfillmentService } from '../fulfillment/fulfillment.service';

@Injectable()
export class OrderService {
    private log(message: string) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[OrderService] ${message}\n`);
    }

    constructor(
        private prisma: PrismaService,
        private strategyService: StrategyService,
        private inventoryService: InventoryService,
        private fulfillmentService: FulfillmentService,
    ) { }

    async createOrder(data: { customerId: string; priority: string; items: { productId: string; quantity: number }[]; expectedDate?: Date; warehouseId?: string }): Promise<Order> {
        // 1. Create Order
        const order = await this.prisma.order.create({
            data: {
                customerId: data.customerId,
                priority: data.priority,
                status: 'PENDING',
                expectedDate: data.expectedDate,
                warehouseId: data.warehouseId,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: { items: true },
        });

        // 1.5 Allocate Order (Fulfillment Logic)
        if (!data.warehouseId) {
            try {
                await this.fulfillmentService.allocateOrder(order.id);
            } catch (e: any) {
                this.log(`Allocation failed: ${e.message}`);
            }
        }

        // 2. Determine Reservation Strategy
        const reservationStrategies = await this.strategyService.getReservationStrategies();
        let activeStrategy = reservationStrategies.find(s => s.active);

        if (!activeStrategy) {
            this.log('No active strategy found. Checking if any strategy exists...');
            if (reservationStrategies.length > 0) {
                // Fallback: Use the most recently created one or a default
                this.log('Falling back to the most recent strategy.');
                activeStrategy = reservationStrategies[reservationStrategies.length - 1];
            } else {
                this.log('No strategies defined at all.');
            }
        }

        this.log(`Active Strategy: ${activeStrategy?.name} (Active: ${activeStrategy?.active}) Rules: ${activeStrategy?.rules}`);

        let shouldReserve = true; // Default to true (e.g. At Confirmation)

        if (activeStrategy) {
            try {
                const rules = JSON.parse(activeStrategy.rules);
                this.log(`Parsed Rules: ${JSON.stringify(rules)}`);

                if (rules.method === 'manually') {
                    shouldReserve = false;
                } else if (rules.method === 'before_date') {
                    if (!data.expectedDate) {
                        shouldReserve = true;
                    } else {
                        const daysBefore = rules.daysBefore || 0;
                        const reservationDate = new Date(data.expectedDate);
                        reservationDate.setDate(reservationDate.getDate() - daysBefore);

                        this.log(`Expected: ${data.expectedDate} DaysBefore: ${daysBefore} ResDate: ${reservationDate} Now: ${new Date()}`);

                        if (new Date() < reservationDate) {
                            shouldReserve = false;
                        }
                    }
                }
            } catch (e) {
                this.log('Invalid reservation strategy rules, defaulting to immediate reservation');
            }
        }

        this.log(`Should Reserve: ${shouldReserve}`);

        if (shouldReserve) {
            // 3. Reserve Stock
            // In a real app, we'd check each product's perishability for FEFO
            const strategyName = activeStrategy?.name === 'FEFO' ? 'FEFO' : 'FIFO';

            try {
                await this.inventoryService.reserveStock({
                    orderId: order.id,
                    items: data.items,
                    strategy: strategyName,
                });

                // 4. Update Order Status
                return this.prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'RESERVED' },
                    include: { items: true },
                });
            } catch (error: any) {
                // If reservation fails (e.g. no stock), keep as PENDING
                this.log(`Reservation failed (insufficient stock?), keeping order as PENDING. Error: ${error.message}`);
                return order;
            }
        }

        return order;
    }

    async getOrders(): Promise<Order[]> {
        return this.prisma.order.findMany({
            include: { items: true, reservations: true, shipment: true },
        });
    }

    async getOrder(id: string): Promise<Order | null> {
        return this.prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                reservations: true,
                shipment: true,
                pickingTasks: {
                    include: { sourceLocation: true }
                }
            },
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
    async checkAvailability(id: string): Promise<Order> {
        const order = await this.getOrder(id) as any;
        if (!order) throw new Error('Order not found');

        // 1. Get Strategy
        const reservationStrategies = await this.strategyService.getReservationStrategies();
        const activeStrategy = reservationStrategies.find(s => s.active) || reservationStrategies[reservationStrategies.length - 1];

        // 2. Reserve
        const strategyName = activeStrategy?.name === 'FEFO' ? 'FEFO' : 'FIFO';
        try {
            await this.inventoryService.reserveStock({
                orderId: order.id,
                items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
                strategy: strategyName,
            });

            // 3. Update Status
            return this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'RESERVED' },
                include: { items: true },
            });
        } catch (error: any) {
            this.log(`Check Availability failed: ${error.message}`);
            throw new BadRequestException(error.message);
        }
    }
}
