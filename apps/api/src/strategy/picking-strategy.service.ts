import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PickingStrategyService {
    constructor(private prisma: PrismaService) { }

    // --- Batch Picking ---
    // Groups whole orders together based on criteria
    async createBatch(criteria: 'contact' | 'carrier' | 'location' = 'location', warehouseId?: string) {
        // 1. Find all PENDING orders
        const whereClause: any = { status: 'PENDING' };
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
        const whereClause: any = { status: 'PENDING' };
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
        const whereClause: any = { status: 'PENDING' };
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
}
