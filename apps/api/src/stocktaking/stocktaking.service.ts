
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class StocktakingService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
    ) { }

    async createSession(data: { warehouseId: string; type: string; description?: string }) {
        return this.prisma.stocktakeSession.create({
            data: {
                ...data,
                status: 'PLANNED',
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

        // Logic: Snapshot all inventory in this warehouse
        // IMPROVEMENT: Can filter by Location/Zone if we add 'scope' to session later.

        // Group by Location + Product
        const inventory = await this.prisma.productInventory.findMany({
            where: { warehouseId: session.warehouseId },
            include: { location: true, product: true }
        });

        // Create tasks
        const tasksPayload = inventory.map(inv => ({
            sessionId,
            locationId: inv.locationId!, // Assuming inventory always has location in this context? If aggregate has no location, it's problematic. ProductInventory usually has locationId nullable.
            // If locationId is null (warehouse level aggregate), we can't count it specifically in a location.
            // Filter out null locations for now.
            productId: inv.productId,
            systemQuantity: inv.quantity,
            status: 'PENDING'
        })).filter(t => t.locationId); // Only location-specific inventory

        // Bulk insert not supported easily with createMany AND relations unless pure IDs. 
        // createMany is supported.
        if (tasksPayload.length > 0) {
            await this.prisma.stocktakeTask.createMany({
                data: tasksPayload as any // Cast to avoid strict type issues if generated client is lagging
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
