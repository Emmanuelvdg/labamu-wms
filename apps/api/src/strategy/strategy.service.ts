import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StrategyService {
    constructor(private prisma: PrismaService) { }

    async evaluatePickingStrategy(orderData: { priority: string; itemCount: number; items: any[] }): Promise<string> {
        // Check for active override
        const activeStrategy = await this.prisma.pickingStrategy.findFirst({
            where: { active: true },
        });
        if (activeStrategy && activeStrategy.name !== 'Wave') { // Assume Wave is default/fallback
            // In a real app, we'd evaluate rules here. For now, if a specific one is forced active, use it.
            // But usually multiple can be active. Let's stick to the logic but allow "disabling" strategies.
        }

        // Logic:
        // 1. High priority -> Single Picking
        if (orderData.priority === 'HIGH') return 'Single';

        // 2. Large volume -> Batch Picking
        if (orderData.itemCount > 20) return 'Batch';

        // 3. Cluster
        const zones = new Set(orderData.items.map(i => i.zone));
        if (zones.size === 1 && orderData.items.length > 1) return 'Cluster';

        return 'Wave';
    }

    async evaluateReservationStrategy(productData: { isPerishable: boolean; location: any }): Promise<string> {
        // Check if FEFO is active
        const fefo = await this.prisma.reservationStrategy.findUnique({ where: { name: 'FEFO' } });

        if (productData.isPerishable && fefo?.active) {
            return 'FEFO';
        }

        return 'FIFO';
    }

    async getPickingStrategies() {
        return this.prisma.pickingStrategy.findMany();
    }

    async getReservationStrategies() {
        return this.prisma.reservationStrategy.findMany();
    }

    async togglePickingStrategy(id: string, active: boolean) {
        return this.prisma.pickingStrategy.update({
            where: { id },
            data: { active },
        });
    }

    async toggleReservationStrategy(id: string, active: boolean) {
        return this.prisma.reservationStrategy.update({
            where: { id },
            data: { active },
        });
    }
}
