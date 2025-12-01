import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SupplierService {
    constructor(private prisma: PrismaService) { }

    async create(data: { name: string; contactInfo?: string }) {
        return this.prisma.supplier.create({
            data,
        });
    }

    async findAll() {
        return this.prisma.supplier.findMany({
            include: {
                _count: {
                    select: { purchaseOrders: true },
                },
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.supplier.findUnique({
            where: { id },
            include: {
                purchaseOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 5, // Recent orders
                },
            },
        });
    }

    async update(id: string, data: { name?: string; contactInfo?: string }) {
        return this.prisma.supplier.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.supplier.delete({
            where: { id },
        });
    }

    async getSupplierStats(id: string) {
        const orders = await this.prisma.purchaseOrder.findMany({
            where: { supplierId: id },
            include: { items: true },
        });

        const totalOrders = orders.length;
        let totalSpend = 0;
        let totalItems = 0;

        for (const order of orders) {
            for (const item of order.items) {
                totalSpend += item.quantity * item.unitCost;
                totalItems += item.quantity;
            }
        }

        return {
            totalOrders,
            totalSpend,
            totalItems,
        };
    }

    async getSupplierOrders(id: string) {
        const orders = await this.prisma.purchaseOrder.findMany({
            where: { supplierId: id },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        return orders.map(order => ({
            ...order,
            totalAmount: order.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
            totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        }));
    }

    async getProductPriceHistory(productId: string) {
        const items = await this.prisma.purchaseOrderItem.findMany({
            where: { productId },
            include: {
                purchaseOrder: {
                    include: { supplier: true },
                },
            },
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
        });

        return items.map(item => ({
            date: item.purchaseOrder.createdAt,
            supplierName: item.purchaseOrder.supplier.name,
            unitCost: item.unitCost,
            quantity: item.quantity,
        }));
    }
}
