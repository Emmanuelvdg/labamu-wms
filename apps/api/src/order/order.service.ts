import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma.service';
import { StrategyService } from '../strategy/strategy.service';
import { InventoryService } from '../inventory/inventory.service';
import { Order } from '@labamu/database';

import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { ShippingService } from '../shipping/shipping.service';
import { PickingStrategyService } from '../strategy/picking-strategy.service';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    private log(message: string) {
        this.logger.log(message);
    }

    constructor(
        private prisma: PrismaService,
        private strategyService: StrategyService,
        private inventoryService: InventoryService,
        private fulfillmentService: FulfillmentService,
        private shippingService: ShippingService,
        private pickingStrategyService: PickingStrategyService,
    ) { }

    async createOrder(data: {
        customerId?: string;
        priority: string;
        items: { productId: string; quantity: number }[];
        expectedDate?: Date;
        warehouseId?: string;
        type?: 'SALES' | 'TRANSFER' | 'STO';
        destinationWarehouseId?: string;
        parentOrderId?: string;
        // Shipping
        deliveryMethodId?: string;
        shippingCostInCOGS?: boolean;
    }): Promise<Order> {
        let shippingCost = 0;

        // FETCH PRODUCT DETAILS FOR CALCULATION (Always needed for Total Amount)
        const productIds = data.items.map(i => i.productId);
        const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });

        let totalWeight = 0;
        let totalVolume = 0;
        let totalAmount = 0; // NEW: Calculate Order Total

        for (const item of data.items) {
            const p = products.find(prod => prod.id === item.productId);
            if (p) {
                totalWeight += (p.weight || 0) * item.quantity;
                totalVolume += ((p.width || 0) * (p.height || 0) * (p.depth || 0) / 1000000) * item.quantity; // cm3 to m3
                // Calculate Total Amount (Price * Qty)
                totalAmount += (p.price || 0) * item.quantity;
            }
        }

        // Calculate Shipping if Method is Provided
        if (data.deliveryMethodId) {
            shippingCost = await this.shippingService.calculateCost(data.deliveryMethodId, {
                weight: totalWeight,
                volume: totalVolume,
                price: totalAmount // Used for insurance if needed
            });
        }

        // 1. Create Order
        const order = await this.prisma.order.create({
            data: {
                customerId: data.customerId || undefined,
                priority: data.priority,
                status: 'PENDING',
                expectedDate: data.expectedDate,
                warehouseId: data.warehouseId,
                type: data.type || 'SALES',
                destinationWarehouseId: data.destinationWarehouseId,
                parentOrderId: data.parentOrderId,
                // Shipping
                deliveryMethodId: data.deliveryMethodId,
                shippingCost: shippingCost,
                shippingCostInCOGS: data.shippingCostInCOGS || false,
                totalAmount: totalAmount, // Save Total Amount
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
                // Verify allocation is possible strictly using rotation policies first
                for (const item of data.items) {
                    const allocations = await this.pickingStrategyService.allocateStock(
                        item.productId,
                        item.quantity,
                        data.warehouseId || order.warehouseId!, // Ensure we have warehouse
                        undefined, // Default strategy (use rules)
                        false // commit: false (Do not reserve batches in helper, only check feasibility)
                    );

                    if (allocations.length === 0) {
                        throw new Error(`Insufficient stock for product ${item.productId} based on rotation rules`);
                    }
                }

                // Logical reservation (creates Reservation objects + ProductInventory.reserved)
                await this.inventoryService.reserveStock({
                    orderId: order.id,
                    items: data.items,
                    strategy: strategyName,
                    warehouseId: data.warehouseId || order.warehouseId!
                });

                // 4. Update Order Status
                return await this.prisma.order.update({
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
            orderBy: { createdAt: 'desc' },
            include: { items: true, reservations: true, shipment: true, destinationWarehouse: true, warehouse: true },
        });
    }

    async getOrder(id: string): Promise<Order | null> {
        return this.prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                reservations: true,
                shipment: true,
                warehouse: true, // Include warehouse for UI
                deliveryMethod: true, // Include delivery method for Lalamove card
                customer: true, // Include customer details
                lalamoveOrders: true, // Include Lalamove delivery orders
                pickingTasks: {
                    include: { sourceLocation: true }
                }
            },
        });
    }

    async createShipment(data: { orderId: string; carrier: string; trackingId: string }) {
        return this.prisma.$transaction(async (tx) => {
            // Guard: Ensure the order exists and has at least one line item
            const orderCheck = await tx.order.findUnique({
                where: { id: data.orderId },
                include: { items: true }
            });
            if (!orderCheck) throw new AppError('ORDER_NOT_FOUND', { orderId: data.orderId });
            if (orderCheck.items.length === 0) {
                throw new BadRequestException('Cannot ship an order with no line items. Please add products to this order first.');
            }

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
            const order = await tx.order.update({
                where: { id: data.orderId },
                data: { status: 'SHIPPED' },
                include: { items: true }
            });

            // 3. Deduct Inventory (Commit Reservations)
            const reservations = await tx.reservation.findMany({
                where: { orderId: data.orderId },
            });

            for (const res of reservations) {
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

                // Log transaction
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

            // 4. Generate stock move to Shipping Dock
            if (order.warehouseId) {
                try {
                    const warehouse = await tx.warehouse.findUnique({
                        where: { id: order.warehouseId },
                        select: { outgoingSteps: true }
                    });

                    const outgoingSteps = warehouse?.outgoingSteps || '1_step';

                    // Determine source zone based on outgoing steps
                    let sourceAreaType = 'STORAGE';
                    if (outgoingSteps === '2_steps') {
                        sourceAreaType = 'PICKING'; // 2-step: Picking → Shipping
                    } else if (outgoingSteps === '3_steps') {
                        sourceAreaType = 'PACKING'; // 3-step: Packing → Shipping
                    }

                    const shippingArea = await tx.warehouseFunctionalArea.findFirst({
                        where: { warehouseId: order.warehouseId, areaType: 'SHIPPING' }
                    });
                    const sourceArea = outgoingSteps === '1_step' ? null : await tx.warehouseFunctionalArea.findFirst({
                        where: { warehouseId: order.warehouseId, areaType: sourceAreaType }
                    });

                    const destLocationId = shippingArea?.linkedLocationId;
                    const sourceLocationId = sourceArea?.linkedLocationId;

                    if (destLocationId) {
                        for (const item of order.items) {
                            await tx.stockMove.create({
                                data: {
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    sourceLocationId: sourceLocationId || undefined,
                                    destinationLocationId: destLocationId,
                                    status: 'DONE',
                                    origin: `ORDER-${data.orderId.substring(0, 8)}-SHIP`,
                                }
                            });
                        }
                        console.log(`[Shipment] Stock moves: ${sourceAreaType}→SHIPPING for order ${data.orderId.substring(0, 8)} (${outgoingSteps})`);
                    }
                } catch (error) {
                    console.error(`[Shipment] Failed to create stock moves:`, error);
                }
            }

            return shipment;
        });
    }
    async checkAvailability(id: string): Promise<Order> {
        let order = await this.getOrder(id) as any;
        if (!order) throw new AppError('ORDER_NOT_FOUND', { orderId: id });

        // 1. Ensure Allocation
        if (!order.warehouseId) {
            this.log(`Order ${id} has no warehouse. Triggering allocation...`);
            await this.fulfillmentService.allocateOrder(id);
            // Refresh order
            order = await this.getOrder(id) as any;
        }

        // 2. Get Strategy
        const reservationStrategies = await this.strategyService.getReservationStrategies();
        const activeStrategy = reservationStrategies.find(s => s.active) || reservationStrategies[reservationStrategies.length - 1];

        // 3. Reserve (Strictly from assigned warehouse)
        const strategyName = activeStrategy?.name === 'FEFO' ? 'FEFO' : 'FIFO';
        try {
            await this.inventoryService.reserveStock({
                orderId: order.id,
                items: order.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })),
                strategy: strategyName,
                warehouseId: order.warehouseId // Strict Filter
            });

            // 4. Update Status
            return this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'RESERVED' },
                include: { items: true },
            });
        } catch (error: any) {
            this.log(`Check Availability failed: ${error.message}`);
            // Provide clarity if it's due to IWT pending
            if (order.fulfillmentStatus === 'PARTIAL' || order.fulfillmentStatus === 'UNALLOCATED') {
                throw new BadRequestException(`Stock check failed: Order is ${order.fulfillmentStatus} (likely waiting for IWT or stock). Logic: ${error.message}`);
            }
            throw new BadRequestException(error.message);
        }
    }

    async cancelOrder(id: string) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id },
                include: { reservations: true }
            });

            if (!order) throw new AppError('ORDER_NOT_FOUND', { orderId: id });
            if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
                throw new BadRequestException('Cannot cancel shipped or delivered order');
            }
            if (order.status === 'CANCELLED') {
                return order;
            }

            // Release Reservations
            for (const res of order.reservations) {
                // Find inventory to release (Best effort match)
                const inventory = await tx.productInventory.findFirst({
                    where: { productId: res.productId, reserved: { gte: res.quantity } }
                });

                if (inventory) {
                    await tx.productInventory.update({
                        where: { id: inventory.id },
                        data: { reserved: { decrement: res.quantity } }
                    });
                }
            }

            // Remove Reservation Records
            await tx.reservation.deleteMany({ where: { orderId: id } });

            // Update Picking Tasks? (Cancel them)
            await tx.pickingTask.updateMany({
                where: { orderId: id },
                data: { status: 'CANCELLED' }
            });

            // Update Order Status
            return tx.order.update({
                where: { id },
                data: { status: 'CANCELLED' }
            });
        });
    }

    async deleteOrder(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { reservations: true, shipment: true }
        });

        if (!order) throw new AppError('ORDER_NOT_FOUND', { orderId: id });

        // Allow delete if Pending (no reservations), Draft (if exists), or Cancelled
        const isCleanPending = order.status === 'PENDING' && order.reservations.length === 0 && !order.shipment;
        const isCancelled = order.status === 'CANCELLED';

        if (!isCleanPending && !isCancelled) {
            throw new BadRequestException('Can only delete Pending (empty) or Cancelled orders. Please Cancel first.');
        }

        return this.prisma.order.delete({ where: { id } });
    }

    async updateOrder(id: string, data: any): Promise<Order> {
        const updateData: any = {};

        // Allow updating delivery method
        if (data.deliveryMethodId) {
            updateData.deliveryMethodId = data.deliveryMethodId;
        }

        // Allow reassigning warehouse (e.g. fixing orders stuck in PICKING with no warehouse)
        if (data.warehouseId !== undefined) {
            updateData.warehouseId = data.warehouseId;
        }

        // Allow updating status (for fulfillment workflow transitions)
        if (data.status) {
            updateData.status = data.status;

            // Generate stock moves on status transitions
            try {
                const order = await this.prisma.order.findUnique({
                    where: { id },
                    include: { items: { include: { product: true } } }
                });

                if (order?.warehouseId) {
                    const warehouse = await this.prisma.warehouse.findUnique({
                        where: { id: order.warehouseId },
                        select: { outgoingSteps: true, id: true }
                    });

                    const outgoingSteps = warehouse?.outgoingSteps || '1_step';

                    // PACKED transition: move stock from Picking Zone → Packing Zone (3-step only)
                    if (data.status === 'PACKED' && outgoingSteps === '3_steps') {
                        const pickingArea = await this.prisma.warehouseFunctionalArea.findFirst({
                            where: { warehouseId: order.warehouseId, areaType: 'PICKING' }
                        });
                        const packingArea = await this.prisma.warehouseFunctionalArea.findFirst({
                            where: { warehouseId: order.warehouseId, areaType: 'PACKING' }
                        });

                        if (pickingArea?.linkedLocationId && packingArea?.linkedLocationId) {
                            for (const item of order.items) {
                                await this.prisma.stockMove.create({
                                    data: {
                                        productId: item.productId,
                                        quantity: item.quantity,
                                        sourceLocationId: pickingArea.linkedLocationId,
                                        destinationLocationId: packingArea.linkedLocationId,
                                        status: 'DONE',
                                        origin: `ORDER-${id.substring(0, 8)}-PACK`,
                                    }
                                });
                            }
                            console.log(`[Order] Stock moves: Picking→Packing for order ${id.substring(0, 8)}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`[Order] Failed to create stock moves for status ${data.status}:`, error);
                // Don't block the status transition if stock move creation fails
            }
        }

        return this.prisma.order.update({
            where: { id },
            data: updateData,
            include: {
                items: { include: { product: true } },
                deliveryMethod: true,
            },
        });
    }
}
