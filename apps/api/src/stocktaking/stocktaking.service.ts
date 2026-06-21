
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class StocktakingService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
    ) { }

    async createSession(data: {
        warehouseId: string;
        type: string;
        description?: string;
        scopeLocationIds?: string[];
        scopeProductIds?: string[];
    }) {
        return this.prisma.stocktakeSession.create({
            data: {
                warehouseId: data.warehouseId,
                type: data.type,
                description: data.description,
                status: 'PLANNED',
                scopeLocationIds: data.scopeLocationIds?.length ? JSON.stringify(data.scopeLocationIds) : null,
                scopeProductIds: data.scopeProductIds?.length ? JSON.stringify(data.scopeProductIds) : null,
            },
        });
    }

    async getSessions(warehouseId?: string) {
        return this.prisma.stocktakeSession.findMany({
            where: warehouseId ? { warehouseId } : {},
            orderBy: { createdAt: 'desc' },
            include: { tasks: true } // Include task summary count maybe?
        });
    }

    async getSession(id: string) {
        const session = await this.prisma.stocktakeSession.findUnique({
            where: { id },
            include: {
                tasks: {
                    include: {
                        product: true,
                        location: true
                    },
                    orderBy: { location: { name: 'asc' } }
                },
                warehouse: true
            }
        });
        if (!session) throw new NotFoundException('Session not found');
        return session;
    }

    async generateTasks(sessionId: string) {
        const session = await this.prisma.stocktakeSession.findUnique({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Session not found');

        const scopeLocationIds: string[] | null = session.scopeLocationIds
            ? JSON.parse(session.scopeLocationIds)
            : null;
        const scopeProductIds: string[] | null = session.scopeProductIds
            ? JSON.parse(session.scopeProductIds)
            : null;

        const inventoryWhere: any = { warehouseId: session.warehouseId };
        if (scopeLocationIds?.length) inventoryWhere.locationId = { in: scopeLocationIds };
        if (scopeProductIds?.length) inventoryWhere.productId = { in: scopeProductIds };

        // Process inventory in batches to avoid OOM on large warehouses
        const BATCH_SIZE = 1000;
        let cursor: string | undefined;
        const tasksPayload: any[] = [];

        while (true) {
            const batch = await this.prisma.productInventory.findMany({
                where: inventoryWhere,
                include: { location: true, product: true },
                take: BATCH_SIZE,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { id: 'asc' },
            });

            for (const inv of batch) {
                if (inv.locationId) {
                    tasksPayload.push({ sessionId, locationId: inv.locationId, productId: inv.productId, systemQuantity: inv.quantity, status: 'PENDING' });
                }
            }

            if (batch.length < BATCH_SIZE) break;
            cursor = batch[batch.length - 1].id;
        }

        if (tasksPayload.length > 0) {
            await this.prisma.stocktakeTask.createMany({
                data: tasksPayload as any
            });
        }

        return this.prisma.stocktakeSession.update({
            where: { id: sessionId },
            data: { status: 'IN_PROGRESS' }
        });
    }

    async submitCount(taskId: string, countedQuantity: number, countedBy: string) {
        return this.prisma.stocktakeTask.update({
            where: { id: taskId },
            data: {
                countedQuantity,
                countedBy,
                countedAt: new Date(),
                status: 'COUNTED'
            }
        });
    }

    async reconcileSession(sessionId: string) {
        const session = await this.getSession(sessionId);

        // Find tasks with variance
        const varianceTasks = session.tasks.filter(t =>
            t.status === 'COUNTED' &&
            t.countedQuantity !== null &&
            t.countedQuantity !== t.systemQuantity
        );

        for (const task of varianceTasks) {
            const variance = task.countedQuantity! - task.systemQuantity;

            // Create Adjustment
            // Note: inventoryService.adjustStock usually expects "Quantity to Add/Remove" or "New Total".
            // Let's check inventoryService signature.
            // Assuming createAdjustment(dto).

            // Fetch current real-time stock
            const currentStockRecord = await this.prisma.productInventory.findFirst({
                where: { productId: task.productId!, locationId: task.locationId }
            });
            const currentQty = currentStockRecord ? currentStockRecord.quantity : 0;

            await this.inventoryService.createAdjustment({
                locationId: task.locationId,
                productId: task.productId!,
                countedQuantity: task.countedQuantity!,
                currentQuantity: currentQty,
                reason: `Stocktake Variance: Session ${session.id}`,
                status: 'APPLIED'
            });

            await this.prisma.stocktakeTask.update({
                where: { id: task.id },
                data: { status: 'VERIFIED' }
            });
        }

        // Close Session
        await this.prisma.stocktakeSession.update({
            where: { id: sessionId },
            data: { status: 'COMPLETED' }
        });

        return { reconciledCount: varianceTasks.length };
    }
}
