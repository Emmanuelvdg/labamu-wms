import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryLedgerQueryDto } from './inventory-ledger-query.dto';
import { getCurrentCompanyId } from '../common/tenant/tenant-storage';

@Injectable()
export class InventoryLedgerService {
    constructor(private readonly prisma: PrismaService) { }

    private parseDateRange(query?: any): { startDate: Date; endDate: Date } {
        const endDate = new Date();
        let startDate: Date;
        if (query?.period === 'custom' && query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate.setTime(new Date(query.endDate).getTime());
        } else {
            const days = query?.period === '30d' ? 30 : query?.period === '90d' ? 90 : 7;
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }
        return { startDate, endDate };
    }

    /**
       * Fetch ledger entries for inventory movements.
       * Types:
       *  - PUTAWAY: initial stock entries from productInventory (quantity > 0)
       *  - PICKING: order items that are being picked (status PENDING or PICKING)
       *  - SHIPPED: orders with status SHIPPED
       *  - ADJUSTMENT: from inventoryAdjustment table
       */
    async getLedgerEntries(query: InventoryLedgerQueryDto) {
        const companyId = getCurrentCompanyId();
        const tenantWhere = companyId ? { companyId } : {};
        const { startDate, endDate } = this.parseDateRange(query);
        const entries: any[] = [];

        // 1. Inbound: Receipts (instead of ProductInventory snapshot)
        const receipts = await this.prisma.receipt.findMany({
            where: {
                ...tenantWhere,
                receivedAt: { gte: startDate, lte: endDate },
                status: 'DONE',
            },
            include: {
                items: { include: { product: { select: { sku: true, name: true } } } },
                destinationLocation: {
                    select: {
                        name: true,
                        warehouseView: { select: { name: true } } // Use warehouseView relation based on schema
                    }
                },
            },
        });

        for (const receipt of receipts) {
            for (const item of receipt.items) {
                entries.push({
                    date: receipt.receivedAt.toISOString(),
                    type: 'RECEIPT', // or PUTAWAY
                    productSku: item.product.sku,
                    productName: item.product.name,
                    quantity: item.quantity,
                    warehouseName: receipt.destinationLocation?.warehouseView?.name || 'Unknown',
                    locationName: receipt.destinationLocation?.name,
                    orderIds: [receipt.purchaseOrderId], // Link to PO
                    notes: 'Inbound receipt',
                });
            }
        }

        // 2. Outbound: Picking / Pending / Shipped order items
        // Note: For Order, 'warehouse' relation is direct.
        const orders = await this.prisma.order.findMany({
            where: {
                ...tenantWhere,
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['PENDING', 'PICKING', 'SHIPPED'] },
            },
            include: {
                items: { include: { product: { select: { sku: true, name: true } } } },
                warehouse: { select: { name: true } },
                // Order might not have location directly, usually it's derived or on items.
                // Schema has `warehouseId` on Order, but `locationId` is NOT on Order header in the schema I viewed.
                // Checking schema: Order has `warehouseId`, `destinationWarehouseId`... no `locationId`.
                // Picking happens from `PickingTask`.
                // For simplicity, we'll leave location empty for Orders or use 'General'.
            },
        });

        for (const order of orders) {
            for (const item of order.items) {
                const qty = item.quantity ?? 0;
                const type = order.status === 'SHIPPED' ? 'SHIPPED' : order.status === 'PICKING' ? 'PICKING' : 'PENDING';
                entries.push({
                    date: order.createdAt.toISOString(),
                    type,
                    productSku: item.product.sku,
                    productName: item.product.name,
                    quantity: -Math.abs(qty), // decrease
                    warehouseName: order.warehouse?.name,
                    locationName: '', // Order header doesn't specify source location, specific tasks do.
                    orderIds: [order.id],
                    notes: `${type.toLowerCase()} order`,
                });
            }
        }

        // 3. Adjustments (lost, damaged, manual adjustments)
        // inventoryAdjustment has no direct companyId; scope via product relation
        const adjustments = await this.prisma.inventoryAdjustment.findMany({
            where: {
                ...(companyId ? { product: { companyId } } : {}),
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                product: { select: { sku: true, name: true } },
                location: { select: { name: true, warehouseView: { select: { name: true } } } },
                // Adjustment has locationId, location has warehouseView.
                // Adjustment does NOT have direct warehouseId relation in schema?
                // Schema Line 510: `model InventoryAdjustment { ... locationId ... }`
                // It does NOT show `warehouseId`.
                // So we must get warehouse via Location.
            },
        });

        for (const adj of adjustments) {
            entries.push({
                date: adj.createdAt.toISOString(),
                type: 'ADJUSTMENT',
                productSku: adj.product.sku,
                productName: adj.product.name,
                quantity: adj.quantity,
                warehouseName: adj.location?.warehouseView?.name,
                locationName: adj.location?.name,
                orderIds: [],
                notes: adj.reason || '',
            });
        }

        // Apply optional filters from query
        const filtered = entries.filter((e) => {
            if (query.warehouseId && e.warehouseName && e.warehouseName !== query.warehouseId) return false;
            if (query.locationId && e.locationName && e.locationName !== query.locationId) return false;
            if (query.status && e.type !== query.status) return false;
            if (query.productId && e.productSku !== query.productId) return false;
            return true;
        });

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Handle CSV Export
        if (query.format === 'csv') {
            const header = 'Date,Type,Product SKU,Product Name,Quantity,Warehouse,Location,Order IDs,Notes\n';
            const rows = filtered.map(e => {
                return [
                    e.date,
                    e.type,
                    e.productSku,
                    e.productName ? `"${e.productName.replace(/"/g, '""')}"` : '',
                    e.quantity,
                    e.warehouseName,
                    e.locationName,
                    e.orderIds?.join(';'),
                    e.notes ? `"${e.notes.replace(/"/g, '""')}"` : ''
                ].join(',');
            }).join('\n');
            return header + rows;
        }

        // Handle Pagination
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginated = filtered.slice(startIndex, endIndex);

        return {
            data: paginated,
            meta: {
                total: filtered.length,
                page,
                limit,
                totalPages: Math.ceil(filtered.length / limit),
            }
        };
    }
}
