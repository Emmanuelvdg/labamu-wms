import { Injectable, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RotationRuleResolverService } from '../inventory/rotation-rule-resolver.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PICKING_SESSION_COMPLETED, PickingSessionCompletedEvent } from './events/picking.events';
import { FeatureFlagService } from '../company/feature-flag.service';
import { getCurrentCompanyId } from '../common/tenant/tenant-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/printer').default;

type PickingStrategyType = 'BATCH' | 'CLUSTER' | 'WAVE' | 'SINGLE' | 'WAVELESS' | 'ZONE';

@Injectable()
export class PickingStrategyService {
    private readonly fonts = {
        Roboto: {
            normal: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
            bold: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
            italics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
            bolditalics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
        },
    };

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private ruleResolver: RotationRuleResolverService,
        private eventEmitter: EventEmitter2,
        private featureFlags: FeatureFlagService,
    ) { }

    // ── Feature flag check ────────────────────────────────────────────────────

    private async assertAdvancedPickingEnabled(): Promise<void> {
        const companyId = getCurrentCompanyId();
        if (!companyId) return; // platform admin bypasses
        const flags = await this.featureFlags.getFlagsForCompany(companyId);
        const flag = flags.find(f => f.key === 'ADVANCED_PICKING');
        if (!flag?.enabled) {
            throw new ForbiddenException('The "ADVANCED_PICKING" feature is not enabled for your account.');
        }
    }

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

    // --- Waveless Picking ---
    // Continuous flow picking, releases orders immediately
    async createWavelessSession(warehouseId: string) {
        const session = await this.prisma.pickingSession.create({
            data: {
                warehouseId,
                strategy: 'WAVELESS',
                status: 'IN_PROGRESS',
            }
        });

        // Immediately assign any currently pending reserved orders
        await this.assignContinuousTasks(session.id);

        // Return full session with tasks
        return this.getActiveSession(warehouseId);
    }

    async assignContinuousTasks(sessionId: string) {
        const session = await this.prisma.pickingSession.findUnique({ where: { id: sessionId } });
        if (!session) return;

        // Find RESERVED orders that haven't been picked yet
        const orders = await this.prisma.order.findMany({
            where: {
                OR: [
                    { warehouseId: session.warehouseId },
                    { warehouseId: null }
                ],
                status: 'RESERVED',
            },
            take: 10,
            include: { items: true },
            orderBy: { createdAt: 'asc' }
        });

        for (const order of orders) {
            let tasksCreated = false;
            for (const item of order.items) {
                const allocations = await this.allocateStock(item.productId, item.quantity, session.warehouseId, 'FEFO');
                for (const alloc of allocations) {
                    await this.prisma.pickingTask.create({
                        data: {
                            sessionId: session.id,
                            orderId: order.id,
                            productId: item.productId,
                            sourceLocationId: alloc.locationId,
                            quantity: alloc.quantity,
                            status: 'PENDING'
                        }
                    });
                    tasksCreated = true;
                }
            }
            if (tasksCreated) {
                await this.prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'PICKING' }
                });
            }
        }
    }

    async pollWavelessTasks(sessionId: string) {
        const session = await this.prisma.pickingSession.findUnique({ where: { id: sessionId } });
        if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

        // Assign more tasks if the queue is low
        await this.assignContinuousTasks(sessionId);

        // Fetch pending tasks from this session
        // By ordering by createdAt desc, any freshly inserted 'urgent' picks will naturally appear at the absolute top of the queue
        const pendingTasks = await this.prisma.pickingTask.findMany({
            where: {
                sessionId,
                status: 'PENDING'
            },
            include: {
                product: true,
                sourceLocation: true,
                order: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return pendingTasks;
    }

    async insertUrgentPick(sessionId: string, orderId: string) {
        const session = await this.prisma.pickingSession.findUnique({ where: { id: sessionId } });
        if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } }
        });

        if (!order || order.status !== 'RESERVED') {
            throw new HttpException('Order not found or not reserved', HttpStatus.BAD_REQUEST);
        }

        let orderHasTasks = false;
        for (const item of order.items) {
            const allocations = await this.allocateStock(item.productId, item.quantity, session.warehouseId, 'FEFO');
            for (const alloc of allocations) {
                await this.prisma.pickingTask.create({
                    data: {
                        sessionId: session.id,
                        orderId: order.id,
                        productId: item.productId,
                        sourceLocationId: alloc.locationId,
                        quantity: alloc.quantity,
                        status: 'PENDING'
                    }
                });
                orderHasTasks = true;
            }
        }

        if (orderHasTasks) {
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'PICKING' }
            });
        }

        return { success: true, message: 'Urgent pick inserted', addedTasks: orderHasTasks };
    }

    // --- Zone Picking (M3.1) ---
    // Groups pending order lines by the warehouse zone of their source location.
    // Creates tasks ordered by zone proximity (zonePriority ascending).
    async createZoneSession(warehouseId: string, maxOrders?: number) {
        await this.assertAdvancedPickingEnabled();

        const orders = await this.prisma.order.findMany({
            where: {
                OR: [{ warehouseId }, { warehouseId: null }],
                status: 'RESERVED',
            },
            take: maxOrders || 50,
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'asc' },
        });

        if (orders.length === 0) {
            throw new HttpException('No orders available for picking', HttpStatus.BAD_REQUEST);
        }

        const session = await this.prisma.pickingSession.create({
            data: { warehouseId, strategy: 'ZONE', status: 'IN_PROGRESS' },
        });

        type PendingTask = {
            zonePriority: number;
            orderId: string;
            productId: string;
            sourceLocationId: string;
            quantity: number;
        };

        const pendingTasks: PendingTask[] = [];
        const orderHasTasksMap = new Map<string, boolean>();

        for (const order of orders) {
            for (const item of order.items) {
                const allocations = await this.allocateStock(item.productId, item.quantity, warehouseId, 'FEFO');
                for (const alloc of allocations) {
                    const zone = await this.findZoneAncestor(alloc.locationId);
                    pendingTasks.push({
                        zonePriority: zone.zonePriority,
                        orderId: order.id,
                        productId: item.productId,
                        sourceLocationId: alloc.locationId,
                        quantity: alloc.quantity,
                    });
                    orderHasTasksMap.set(order.id, true);
                }
            }
        }

        // Sort by zone proximity so pickers move through zones in order
        pendingTasks.sort((a, b) => a.zonePriority - b.zonePriority);

        for (const t of pendingTasks) {
            await this.prisma.pickingTask.create({
                data: {
                    sessionId: session.id,
                    orderId: t.orderId,
                    productId: t.productId,
                    sourceLocationId: t.sourceLocationId,
                    quantity: t.quantity,
                    status: 'PENDING',
                },
            });
        }

        for (const orderId of orderHasTasksMap.keys()) {
            await this.prisma.order.update({ where: { id: orderId }, data: { status: 'PICKING' } });
        }

        return this.getActiveSession(warehouseId);
    }

    // Walks up the location hierarchy to find the nearest ZONE ancestor.
    private async findZoneAncestor(locationId: string): Promise<{ id: string; zonePriority: number }> {
        let loc = await this.prisma.location.findUnique({
            where: { id: locationId },
            select: { id: true, structuralType: true, parentId: true, zonePriority: true },
        });

        while (loc) {
            if (loc.structuralType === 'ZONE' || !loc.parentId) {
                return { id: loc.id, zonePriority: loc.zonePriority };
            }
            loc = await this.prisma.location.findUnique({
                where: { id: loc.parentId },
                select: { id: true, structuralType: true, parentId: true, zonePriority: true },
            });
        }

        return { id: locationId, zonePriority: 100 };
    }

    // --- Picking Session Management ---

    async createSession(data: {
        warehouseId: string;
        strategy?: PickingStrategyType;
        criteria?: string;
        maxOrders?: number;
    }) {
        const { warehouseId, criteria, maxOrders } = data;
        let { strategy } = data;

        if (!strategy) {
            strategy = 'SINGLE';
        }

        // ADVANCED_PICKING flag required for any strategy other than SINGLE
        if (strategy !== 'SINGLE' && strategy !== 'WAVELESS') {
            await this.assertAdvancedPickingEnabled();
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
            const allPicked = orderTasks.every(t => t.status === 'PICKED' || t.status === 'COMPLETED');
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

            // 3. Coordinate next steps via Rules/Workflows for picked items
            if (allPicked && session.warehouseId) {
                try {
                    this.eventEmitter.emit(
                        PICKING_SESSION_COMPLETED,
                        new PickingSessionCompletedEvent(
                            sessionId,
                            session.warehouseId,
                            [orderId],
                            orderTasks
                        )
                    );
                    console.log(`[Picking] Emitted completion event for order ${orderId}`);
                } catch (error) {
                    console.error(`[Picking] Failed to emit completion event for order ${orderId}:`, error);
                }
            }
        }

        return { success: true };
    }

    // --- Picking List PDF (M3.3) ---
    async generatePicklistPdf(sessionId: string): Promise<Buffer> {
        const session = await this.prisma.pickingSession.findUnique({
            where: { id: sessionId },
            include: {
                tasks: {
                    include: {
                        product: true,
                        sourceLocation: true,
                        order: true,
                    },
                    orderBy: { sourceLocation: { name: 'asc' } },
                },
                warehouse: true,
            },
        });

        if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

        const rows = session.tasks.map(t => [
            { text: t.sourceLocation?.name ?? '—', style: 'cell' },
            { text: t.order?.id?.slice(0, 8) ?? t.orderId.slice(0, 8), style: 'cell' },
            { text: t.product?.sku ?? '—', style: 'cell' },
            { text: t.product?.name ?? '—', style: 'cell' },
            { text: String(t.quantity), style: 'cell', alignment: 'right' },
            { text: '', style: 'cell' }, // Picked qty (manual fill)
        ]);

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 50, 30, 30],
            content: [
                { text: `Picking List — ${session.warehouse?.name ?? session.warehouseId}`, style: 'title' },
                { text: `Session: ${session.id.slice(0, 8)}  |  Strategy: ${session.strategy}  |  ${new Date().toLocaleDateString()}`, style: 'subtitle', margin: [0, 4, 0, 16] },
                {
                    table: {
                        headerRows: 1,
                        widths: [80, 70, 70, '*', 45, 50],
                        body: [
                            [
                                { text: 'Location', style: 'tableHeader' },
                                { text: 'Order', style: 'tableHeader' },
                                { text: 'SKU', style: 'tableHeader' },
                                { text: 'Product', style: 'tableHeader' },
                                { text: 'Qty', style: 'tableHeader', alignment: 'right' },
                                { text: 'Picked', style: 'tableHeader' },
                            ],
                            ...rows,
                        ],
                    },
                    layout: 'lightHorizontalLines',
                },
            ],
            styles: {
                title: { fontSize: 16, bold: true },
                subtitle: { fontSize: 10, color: '#555' },
                tableHeader: { bold: true, fontSize: 10, fillColor: '#f0f0f0' },
                cell: { fontSize: 9 },
            },
            defaultStyle: { font: 'Roboto' },
        };

        const printer = new PdfPrinter(this.fonts);
        return new Promise((resolve, reject) => {
            const doc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.end();
        });
    }
}
