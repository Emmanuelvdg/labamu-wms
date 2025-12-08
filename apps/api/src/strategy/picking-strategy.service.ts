import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PickingStrategyService {
    constructor(private prisma: PrismaService) { }

    // --- Batch Picking ---
    // Groups whole orders together based on criteria
    async createBatch(criteria: 'contact' | 'carrier' | 'location' = 'location', warehouseId?: string) {
        // 1. Find all PENDING orders
        const whereClause: any = { status: { in: ['PENDING', 'RESERVED'] } };
        if (warehouseId) whereClause.warehouseId = warehouseId;

        const pendingOrders = await this.prisma.order.findMany({
            where: whereClause,
            include: { items: true }
        });

        if (pendingOrders.length === 0) return { message: 'No pending orders to batch.' };

        // 2. Group orders based on criteria
        const batches: Record<string, typeof pendingOrders> = {};

        for (const order of pendingOrders) {
            let key = 'default';
            if (criteria === 'contact') {
                key = order.customerId || 'Unknown';
            } else if (criteria === 'carrier') {
                // Assuming carrier is stored in metadata or similar, falling back to ID for now
                key = 'Carrier-Default';
            } else if (criteria === 'location') {
                // Simple logic: Group by destination (e.g. City/Region if available)
                // For now, we'll simulate grouping by first item's product category as a proxy for "zone"
                // In a real app, this would use the source location of items
                key = 'Zone-A';
            }

            if (!batches[key]) batches[key] = [];
            batches[key].push(order);
        }

        // 3. Create Batch Records (Simulated for now as we might not have a PickingBatch table yet)
        // In a real implementation, we would save this to the DB.
        // For this MVP, we will just return the grouped structure.

        return {
            type: 'BATCH',
            criteria,
            generatedBatches: Object.entries(batches).map(([key, orders]) => ({
                batchKey: key,
                orderCount: orders.length,
                orderIds: orders.map(o => o.id)
            }))
        };
    }

    // --- Cluster Picking ---
    // Groups orders into a "Cluster" where each order is assigned a specific tote/box
    async createClusterBatch(maxSize: number = 4, warehouseId?: string) {
        const whereClause: any = { status: { in: ['PENDING', 'RESERVED'] } };
        if (warehouseId) whereClause.warehouseId = warehouseId;

        const pendingOrders = await this.prisma.order.findMany({
            where: whereClause,
            take: maxSize,
            orderBy: { createdAt: 'asc' },
            include: { items: true }
        });

        if (pendingOrders.length === 0) return { message: 'No pending orders for cluster.' };

        // Assign each order to a "Tote"
        const cluster = pendingOrders.map((order, index) => ({
            orderId: order.id,
            toteLabel: `TOTE-${index + 1}`, // TOTE-1, TOTE-2, etc.
            items: order.items // Items to pick for this tote
        }));

        return {
            type: 'CLUSTER',
            clusterId: `CLUSTER-${Date.now()}`,
            assignments: cluster
        };
    }

    // --- Wave Picking ---
    // Groups line items from multiple orders to pick them all at once
    async createWave(criteria: 'product' | 'category' = 'product', warehouseId?: string) {
        const whereClause: any = { status: { in: ['PENDING', 'RESERVED'] } };
        if (warehouseId) whereClause.warehouseId = warehouseId;

        const pendingOrders = await this.prisma.order.findMany({
            where: whereClause,
            include: { items: { include: { product: true } } }
        });

        if (pendingOrders.length === 0) return { message: 'No pending orders for wave.' };

        const waveItems: Record<string, { productId: string; productName: string; totalQty: number; orderIds: string[] }> = {};

        for (const order of pendingOrders) {
            for (const item of order.items) {
                let key = item.productId;
                if (criteria === 'category') {
                    key = item.product.category || 'Uncategorized';
                }

                if (!waveItems[key]) {
                    waveItems[key] = {
                        productId: item.productId,
                        productName: criteria === 'category' ? key : item.product.name,
                        totalQty: 0,
                        orderIds: []
                    };
                }

                waveItems[key].totalQty += item.quantity;
                if (!waveItems[key].orderIds.includes(order.id)) {
                    waveItems[key].orderIds.push(order.id);
                }
            }
        }

        return {
            type: 'WAVE',
            criteria,
            waveId: `WAVE-${Date.now()}`,
            pickingList: Object.values(waveItems)
        };
    }
    // --- Picking Session Management ---

    async createSession(data: {
        warehouseId: string;
        strategy: 'BATCH' | 'CLUSTER' | 'WAVE' | 'SINGLE';
        criteria?: string;
        maxOrders?: number;
    }) {
        const { warehouseId, strategy, criteria, maxOrders } = data;

        // 1. Find Candidate Orders (RESERVED)
        const orders = await this.prisma.order.findMany({
            where: {
                warehouseId,
                status: 'RESERVED',
            },
            take: maxOrders || 50, // Default limit
            include: {
                items: { include: { product: true } },
                reservations: true
            },
            orderBy: { createdAt: 'asc' }
        });

        if (orders.length === 0) {
            throw new Error('No orders available for picking');
        }

        // 2. Create Session
        const session = await this.prisma.pickingSession.create({
            data: {
                warehouseId,
                strategy,
                status: 'IN_PROGRESS',
            }
        });

        // 3. Create Tasks
        const tasks = [];
        for (const order of orders) {
            // Update Order Status
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'PICKING' }
            });

            for (const item of order.items) {
                // Find where the stock was reserved from (using Reservations)
                // Simplified: If we have a reservation strategy, we should have specific locations.
                // For now, we'll look up the reservation or default to a "Stock" location if not found.

                // Try to find a reservation for this item
                const reservation = order.reservations.find(r => r.productId === item.productId);

                // In a real system, Reservation would link to a specific Location or Inventory ID.
                // Here we'll do a best-effort lookup for stock.
                const stock = await this.prisma.productInventory.findFirst({
                    where: {
                        productId: item.productId,
                        warehouseId,
                        quantity: { gte: item.quantity }
                    },
                    include: { location: true }
                });

                if (stock && stock.location) {
                    const task = await this.prisma.pickingTask.create({
                        data: {
                            sessionId: session.id,
                            orderId: order.id,
                            productId: item.productId,
                            sourceLocationId: stock.locationId!,
                            quantity: item.quantity,
                            status: 'PENDING'
                        }
                    });
                    tasks.push(task);
                } else {
                    // Handle missing stock scenario (shouldn't happen if RESERVED, but safety check)
                    console.warn(`No stock location found for Product ${item.productId} in Order ${order.id}`);
                }
            }
        }

        return this.prisma.pickingSession.findUnique({
            where: { id: session.id },
            include: {
                tasks: {
                    include: {
                        product: true,
                        sourceLocation: true,
                        order: true
                    }
                }
            }
        });
    }

    async getActiveSession(warehouseId: string) {
        return this.prisma.pickingSession.findFirst({
            where: {
                warehouseId,
                status: 'IN_PROGRESS'
            },
            include: {
                tasks: {
                    include: {
                        product: true,
                        sourceLocation: true,
                        order: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateTask(taskId: string, data: { pickedQuantity: number; status: string; exceptionReason?: string }) {
        const task = await this.prisma.pickingTask.update({
            where: { id: taskId },
            data: {
                pickedQuantity: data.pickedQuantity,
                status: data.status,
                exceptionReason: data.exceptionReason
            }
        });

        // If exception, trigger inventory adjustment (placeholder)
        if (data.status === 'FAILED' || data.status === 'PARTIALLY_PICKED') {
            // Logic to flag location for cycle count would go here
            console.log(`Exception reported for Task ${taskId}: ${data.exceptionReason}`);
        }

        return task;
    }

    async completeSession(sessionId: string) {
        const session = await this.prisma.pickingSession.findUnique({
            where: { id: sessionId },
            include: { tasks: true }
        });

        if (!session) throw new Error('Session not found');

        // 1. Update Session Status
        await this.prisma.pickingSession.update({
            where: { id: sessionId },
            data: { status: 'COMPLETED' }
        });

        // 2. Update Order Statuses
        const orderIds = Array.from(new Set(session.tasks.map(t => t.orderId)));

        for (const orderId of orderIds) {
            const orderTasks = session.tasks.filter(t => t.orderId === orderId);
            const allPicked = orderTasks.every(t => t.status === 'PICKED');
            const hasExceptions = orderTasks.some(t => t.status === 'FAILED' || t.status === 'PARTIALLY_PICKED');

            let newStatus = 'PICKING';
            if (hasExceptions) {
                newStatus = 'EXCEPTION'; // Requires Manager Review
            } else if (allPicked) {
                newStatus = 'PACKING'; // Ready for Packing/Shipping
            }

            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: newStatus }
            });
        }

        return { success: true };
    }
}
