import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShippingService {
    constructor(private prisma: PrismaService) { }

    async getDeliveryMethods(activeOnly = true) {
        return this.prisma.deliveryMethod.findMany({
            where: activeOnly ? { active: true } : {},
            include: { rules: { orderBy: { sequence: 'asc' } } },
        });
    }

    async getDeliveryMethod(id: string) {
        const method = await this.prisma.deliveryMethod.findUnique({
            where: { id },
            include: { rules: { orderBy: { sequence: 'asc' } } },
        });
        if (!method) throw new NotFoundException('Delivery method not found');
        return method;
    }

    async createDeliveryMethod(data: any) {
        const { rules, ...methodData } = data;
        return this.prisma.deliveryMethod.create({
            data: {
                ...methodData,
                rules: rules
                    ? {
                        create: rules.map((r: any) => ({
                            ...r,
                            // Ensure optional fields are null if undefined, handled by Prisma usually, 
                            // but specific logic can go here
                        })),
                    }
                    : undefined,
            },
            include: { rules: true },
        });
    }

    async updateDeliveryMethod(id: string, data: any) {
        const { rules, ...methodData } = data;

        // Direct update of method fields
        const updatedMethod = await this.prisma.deliveryMethod.update({
            where: { id },
            data: methodData,
        });

        // If rules are provided, replace them (simple strategy for now: delete all, re-create)
        // For a more complex strategy, we'd need diffing.
        if (rules) {
            await this.prisma.shippingRule.deleteMany({
                where: { deliveryMethodId: id },
            });
            await this.prisma.shippingRule.createMany({
                data: rules.map((r: any) => ({ ...r, deliveryMethodId: id })),
            });
        }

        return this.getDeliveryMethod(id);
    }

    async deleteDeliveryMethod(id: string) {
        // Check usage?
        // For now assuming safe to delete or cascade
        // We should probably check if orders use it, but keeping it simple for now.
        return this.prisma.deliveryMethod.delete({ where: { id } });
    }

    async calculateCost(methodId: string, orderDetails: { weight: number; volume: number; price: number }) {
        const method = await this.getDeliveryMethod(methodId);

        if (method.provider === 'FIXED_PRICE') {
            return method.fixedPrice;
        }

        if (method.provider === 'BASED_ON_RULES') {
            // Find FIRST matching rule
            // Rules are ordered by sequence ASC
            for (const rule of method.rules) {
                let matches = true;

                if (rule.minWeight !== null && orderDetails.weight < rule.minWeight) matches = false;
                if (rule.maxWeight !== null && orderDetails.weight > rule.maxWeight) matches = false;

                if (matches && rule.minVolume !== null && orderDetails.volume < rule.minVolume) matches = false;
                if (matches && rule.maxVolume !== null && orderDetails.volume > rule.maxVolume) matches = false;

                if (matches && rule.minPrice !== null && orderDetails.price < rule.minPrice) matches = false;
                if (matches && rule.maxPrice !== null && orderDetails.price > rule.maxPrice) matches = false;

                if (matches) {
                    return rule.price;
                }
            }

            // Fallback if no rules match? Return 0 or base fixed price?
            // Let's assume fallback to 0 or fixedPrice if set.
            return method.fixedPrice;
        }

        return 0;
    }

    async getShipmentsForManifest(warehouseId: string, dateStr?: string) {
        let date = new Date();
        if (dateStr) {
            date = new Date(dateStr);
        }
        
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        const shipments = await this.prisma.shipment.findMany({
            where: {
                order: {
                    warehouseId: warehouseId,
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    }
                }
            },
            select: { id: true }
        });

        return shipments.map(s => s.id);
    }
}
