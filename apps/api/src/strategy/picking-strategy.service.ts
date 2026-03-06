import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RotationRuleResolverService } from '../inventory/rotation-rule-resolver.service';

@Injectable()
export class PickingStrategyService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private ruleResolver: RotationRuleResolverService
    ) { }

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
                key = 'Carrier-Default';
            } else if (criteria === 'location') {
                key = 'Zone-A';
            }

            if (!batches[key]) batches[key] = [];
            batches[key].push(order);
        }

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
            toteLabel: `TOTE-${index + 1}`,
            items: order.items
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
        strategy?: 'BATCH' | 'CLUSTER' | 'WAVE' | 'SINGLE';
        criteria?: string;
        maxOrders?: number;
    }) {
        const { warehouseId, criteria, maxOrders } = data;
        let { strategy } = data;

        if (!strategy) {
            strategy = 'SINGLE';
        }

        // 1. Find Candidate Orders (RESERVED)
        const orders = await this.prisma.order.findMany({
            where: {
                OR: [
                    { warehouseId },
                    { warehouseId: null }
                ],
                status: 'RESERVED',
            },
            take: maxOrders || 50,
            include: {
                items: { include: { product: true } },
                reservations: true
            },
            orderBy: { createdAt: 'asc' }
        });

        if (orders.length === 0) {
            throw new HttpException('No orders available for picking', HttpStatus.BAD_REQUEST);
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
            let orderHasTasks = false;

            for (const item of order.items) {
                const pickingRule = 'FEFO'; // Force FEFO for now

                const allocations = await this.allocateStock(
                    item.productId,
                    item.quantity,
                    warehouseId,
                    pickingRule
                );

                if (allocations.length === 0) {
                    console.warn(`No stock found for ${item.productId} in Order ${order.id}`);
                    continue;
                }

                for (const alloc of allocations) {
                    const task = await this.prisma.pickingTask.create({
                        data: {
                            sessionId: session.id,
                            orderId: order.id,
                            productId: item.productId,
                            sourceLocationId: alloc.locationId,
                            quantity: alloc.quantity,
                            status: 'PENDING'
                        }
                    });
                    tasks.push(task);
                    orderHasTasks = true;
                }
            }

            if (orderHasTasks) {
                // Update Order Status ONLY if tasks were generated
                await this.prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'PICKING' }
                });
            } else {
                console.warn(`Order ${order.id} skipped - no tasks could be generated (missing inventory)`);
            }
        }

        // Re-fetch with full relations so UI can render product/location/order
        return this.getActiveSession(warehouseId);
    }

    // New Helper: Allocates stock from Batches based on Strategy
    async allocateStock(
        productId: string,
        quantityNeeded: number,
        warehouseId: string,
        overrideStrategy?: 'FIFO' | 'FEFO',
        commit: boolean = true
    ): Promise<{ batchId: string; locationId: string; quantity: number }[]> {

        // Fetch Product to get Category
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        // 1. Resolve Effective Rule
        const rule = await this.ruleResolver.resolveRule({
            productId,
            warehouseId,
            categoryId: product?.category || undefined,
        });

        // 2. Fetch Candidates (Active, Positive Quantity)
        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                productId,
                warehouseId,
                status: 'Active',
                currentQuantity: { gt: 0 }
            },
            include: { location: true }
        });

        // 3. Filter Candidates (Eligibility + Constraints)
        let eligibleBatches = batches.filter(b => (b.currentQuantity - b.reserved) > 0);

        // Constraint: Min Shelf Life (FEFO specific mostly)
        if (rule.minShelfLifeDays) {
            const minExpiry = new Date();
            minExpiry.setDate(minExpiry.getDate() + rule.minShelfLifeDays);
            eligibleBatches = eligibleBatches.filter(b => {
                if (!b.expiryDate) return true; // Handle missing expiry later
                return b.expiryDate >= minExpiry;
            });
        }

        // Constraint: Missing Expiry Handling
        if (rule.missingExpiryAction === 'BLOCK') {
            eligibleBatches = eligibleBatches.filter(b => !!b.expiryDate);
        }

        // 4. Sort Candidates (Strategy)
        const policy = rule.policy || overrideStrategy || 'FIFO';

        eligibleBatches.sort((a, b) => {
            const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : null;
            const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : null;
            const recA = new Date(a.createdAt).getTime();
            const recB = new Date(b.createdAt).getTime();

            if (policy === 'FEFO') {
                if (dateA && dateB) {
                    if (dateA !== dateB) return dateA - dateB;
                    return recA - recB;
                }
                if (!dateA && !dateB) return recA - recB;

                if (dateA && !dateB) return -1;
                if (!dateA && dateB) return 1;
            }

            if (policy === 'LIFO') {
                return recB - recA;
            }

            return recA - recB;
        });

        // 5. Greedily Allocate
        const allocation = [];
        let remaining = quantityNeeded;

        for (const batch of eligibleBatches) {
            if (remaining <= 0) break;

            if (!batch.locationId) continue;

            const available = batch.currentQuantity - batch.reserved;
            const take = Math.min(available, remaining);

            if (take > 0) {
                // Reserve the stock ONLY if commit is true
                if (commit) {
                    await this.prisma.inventoryBatch.update({
                        where: { id: batch.id },
                        data: { reserved: { increment: take } }
                    });
                }

                allocation.push({
                    batchId: batch.id,
                    locationId: batch.locationId,
                    quantity: take
                });

                remaining -= take;
            }
        }


        console.log(`[Allocation] Product: ${productId}, Policy: ${policy}, Applied Rule ID: ${(rule as any).id || 'Default'}`);

        return allocation;
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
                        sourceLocation: {
                            include: {
                                parent: {
                                    include: {
                                        parent: {
                                            include: {
                                                parent: {
                                                    include: {
                                                        parent: {
                                                            include: {
                                                                parent: {
                                                                    include: { parent: true }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        order: true
                    },
                    orderBy: {
                        sourceLocation: { name: 'asc' }
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

        // If exception, trigger inventory adjustment
        if ((task.status === 'FAILED' || task.status === 'PARTIALLY_PICKED') && task.exceptionReason) {
            const failedQty = task.quantity - task.pickedQuantity;
            if (failedQty > 0) {
                console.log(`Exception reported for Task ${taskId}: ${task.exceptionReason}`);
                await this.inventoryService.createStockMove({
                    productId: task.productId,
                    quantity: failedQty,
                    sourceLocationId: task.sourceLocationId,
                    destinationLocationId: null, // Adjustment
                    origin: 'PICKING_EXCEPTION',
                    status: 'COMPLETED'
                });
            }
        }

        return task;
    }

    async scanPick(taskId: string, barcode: string) {
        const task = await this.prisma.pickingTask.findUnique({
            where: { id: taskId },
            include: { product: true }
        });

        if (!task) throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
        if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
            throw new HttpException('Task is already completed or cancelled', HttpStatus.BAD_REQUEST);
        }

        // We assume BarcodeValidatorService was called externally first, or we validate the productId matches the barcode here
        // For simplicity in this method, we just assume the barcode matches the product.
        if (task.product.sku !== barcode && task.product.id !== barcode) {
            throw new HttpException(`Barcode ${barcode} does not match task product`, HttpStatus.BAD_REQUEST);
        }

        // Just execute a full pick for the remaining quantity for now
        // A more advanced version would increment a running count
        return this.updateTask(taskId, {
            pickedQuantity: task.quantity,
            status: 'COMPLETED'
        });
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
                newStatus = 'EXCEPTION';
            } else if (allPicked) {
                newStatus = 'PACKING';
            }

            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: newStatus }
            });

            // 3. Generate stock moves for picked items (Storage → next zone)
            if (allPicked && session.warehouseId) {
                try {
                    const warehouse = await this.prisma.warehouse.findUnique({
                        where: { id: session.warehouseId },
                        select: { outgoingSteps: true }
                    });

                    const outgoingSteps = warehouse?.outgoingSteps || '1_step';

                    // Determine the destination zone based on outgoing steps
                    let destAreaType = 'SHIPPING'; // 1-step: straight to shipping
                    if (outgoingSteps === '2_steps') {
                        destAreaType = 'SHIPPING'; // 2-step: Storage → Shipping
                    } else if (outgoingSteps === '3_steps') {
                        destAreaType = 'PICKING'; // 3-step: Storage → Picking Zone (then Pack, then Ship)
                    }

                    const destArea = await this.prisma.warehouseFunctionalArea.findFirst({
                        where: { warehouseId: session.warehouseId, areaType: destAreaType }
                    });

                    if (destArea?.linkedLocationId) {
                        for (const task of orderTasks) {
                            await this.prisma.stockMove.create({
                                data: {
                                    productId: task.productId,
                                    quantity: task.pickedQuantity || task.quantity,
                                    sourceLocationId: task.sourceLocationId,
                                    destinationLocationId: destArea.linkedLocationId,
                                    status: 'DONE',
                                    origin: `ORDER-${orderId.substring(0, 8)}-PICK`,
                                }
                            });
                        }
                        console.log(`[Picking] Stock moves: Storage→${destAreaType} for order ${orderId.substring(0, 8)} (${outgoingSteps})`);
                    }
                } catch (error) {
                    console.error(`[Picking] Failed to create stock moves for order ${orderId}:`, error);
                }
            }
        }

        return { success: true };
    }
}
