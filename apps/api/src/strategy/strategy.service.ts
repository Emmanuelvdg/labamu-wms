import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StrategyService {
    private log(message: string) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[StrategyService] ${message}\n`);
    }

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
        const strategies = await this.prisma.reservationStrategy.findMany();
        this.log(`Found ${strategies.length} strategies.`);
        strategies.forEach(s => this.log(`- ${s.name}: active=${s.active}, id=${s.id}`));
        return strategies;
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

    // --- CRUD for Picking Strategies ---

    async createPickingStrategy(data: { name: string; rules?: string }) {
        return this.prisma.pickingStrategy.create({
            data: {
                name: data.name,
                rules: data.rules || '{}',
                active: true,
            },
        });
    }

    async updatePickingStrategy(id: string, data: { name?: string; rules?: string; active?: boolean }) {
        return this.prisma.pickingStrategy.update({
            where: { id },
            data,
        });
    }

    async deletePickingStrategy(id: string) {
        return this.prisma.pickingStrategy.delete({
            where: { id },
        });
    }

    // --- CRUD for Reservation Strategies ---

    async createReservationStrategy(data: { name: string; rules?: string }) {
        this.log(`Creating strategy: ${data.name}, active: true`);
        return this.prisma.reservationStrategy.upsert({
            where: { name: data.name },
            update: {
                rules: data.rules || '{}',
                active: true,
            },
            create: {
                name: data.name,
                rules: data.rules || '{}',
                active: true,
            },
        });
    }

    async updateReservationStrategy(id: string, data: { name?: string; rules?: string; active?: boolean }) {
        return this.prisma.reservationStrategy.update({
            where: { id },
            data,
        });
    }

    async deleteReservationStrategy(id: string) {
        return this.prisma.reservationStrategy.delete({
            where: { id },
        });
    }
}
