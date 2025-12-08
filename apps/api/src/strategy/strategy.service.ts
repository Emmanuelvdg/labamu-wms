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

    async evaluatePickingStrategy(orderData: { priority: string; itemCount: number; items: any[]; warehouseId: string }): Promise<string> {
        // Check for active override for this warehouse
        const activeStrategy = await this.prisma.pickingStrategy.findFirst({
            where: {
                active: true,
                warehouseId: orderData.warehouseId
            },
        });

        if (activeStrategy) {
            return activeStrategy.name;
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

    async evaluateReservationStrategy(data: { isPerishable: boolean; location: any }): Promise<string> {
        // Check for active override
        const activeStrategy = await this.prisma.reservationStrategy.findFirst({
            where: { active: true },
        });

        if (activeStrategy) {
            return activeStrategy.name;
        }

        // Default Logic:
        // 1. Perishable -> FEFO (First Expired First Out)
        if (data.isPerishable) return 'FEFO';

        // 2. Default -> FIFO
        return 'FIFO';
    }

    // ... Reservation Strategy methods unchanged ...

    async getPickingStrategies(warehouseId: string) {
        return this.prisma.pickingStrategy.findMany({
            where: { warehouseId }
        });
    }

    // ...

    async getReservationStrategies() {
        return this.prisma.reservationStrategy.findMany();
    }

    async togglePickingStrategy(id: string, active: boolean) {
        // Ensure only one strategy is active per warehouse if we want strict single-strategy
        // For now, just toggle.
        return this.prisma.pickingStrategy.update({
            where: { id },
            data: { active },
        });
    }

    // --- CRUD for Picking Strategies ---

    async createPickingStrategy(data: { name: string; rules?: string; warehouseId: string }) {
        // Deactivate others if we want single active strategy
        // await this.prisma.pickingStrategy.updateMany({ where: { warehouseId: data.warehouseId }, data: { active: false } });

        return this.prisma.pickingStrategy.create({
            data: {
                name: data.name,
                rules: data.rules || '{}',
                active: true,
                warehouseId: data.warehouseId,
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
