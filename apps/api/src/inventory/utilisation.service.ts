
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface UtilizationReport {
    status: 'EMPTY' | 'PARTIAL' | 'FULL' | 'OVERSIZED';
    weightUtilisation: number; // 0-100%
    volumeUtilisation: number; // 0-100%
    palletUtilisation: number; // 0-100%
    details: {
        maxWeight?: number;
        currentWeight: number;
        maxVolume?: number;
        currentVolume: number;
        maxPallets?: number;
        currentPallets: number;
    };
}

@Injectable()
export class UtilisationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate current utilisation of a location (Public wrapper)
     */
    async getLocationUtilisation(locationId: string): Promise<UtilizationReport> {
        const location = await this.prisma.location.findUnique({
            where: { id: locationId },
            include: {
                inventory: { include: { product: true } },
                dynamicAttributes: { include: { definition: true } }
            }
        });

        if (!location) throw new Error('Location not found');
        return this.calculateUtilisation(location);
    }

    /**
     * Batch fetch utilisation for multiple locations
     */
    async getBatchUtilisation(locationIds: string[]): Promise<Record<string, UtilizationReport>> {
        const locations = await this.prisma.location.findMany({
            where: { id: { in: locationIds } },
            include: {
                inventory: { include: { product: true } },
                dynamicAttributes: { include: { definition: true } }
            }
        });

        const results: Record<string, UtilizationReport> = {};
        for (const loc of locations) {
            results[loc.id] = await this.calculateUtilisation(loc);
        }
        return results;
    }

    /**
     * Internal calculation logic (shared)
     */
    private async calculateUtilisation(location: any): Promise<UtilizationReport> {
        // 1. Calculate Constraints
        const maxWeight = (location as any).maxWeightKg || location.maxWeight || 0;

        // Volume: Use specific inner dimensions if available, else maxVolume
        let maxVolume = location.maxVolume || 0;
        if ((location as any).innerLength && ((location as any).innerWidth) && ((location as any).innerHeight)) {
            // mm to m3: (L*W*H) / 1,000,000,000
            maxVolume = ((location as any).innerLength * (location as any).innerWidth * (location as any).innerHeight) / 1e9;
        }

        // Pallets: from dynamic attributes
        let maxPallets = 0;
        let maxPalletsAttr;
        if (location.dynamicAttributes) {
            maxPalletsAttr = location.dynamicAttributes.find((a: any) => a.definition?.name === 'Max Pallets');
        }
        if (maxPalletsAttr && maxPalletsAttr.value) {
            maxPallets = parseFloat(maxPalletsAttr.value);
        }

        // 2. Calculate Current Usage
        let currentWeight = 0;
        let currentVolume = 0;
        let currentPallets = 0;

        // Check if inventory is loaded
        const inventory = location.inventory || [];

        for (const batch of inventory) {
            // Weight
            if (batch.product.weight) {
                currentWeight += batch.product.weight * batch.quantity;
            }

            // Volume
            if (batch.product.width && batch.product.height && batch.product.depth) {
                // mm to m3
                const pVol = (batch.product.width * batch.product.height * batch.product.depth) / 1e9;
                currentVolume += pVol * batch.quantity;
            }

            // Pallets (Simplified estimation)
            if (maxPallets > 0) {
                // Optimization: batch load packaging? For now, we query. 
                // Note: this N+1 query inside loop is bad for batch.
                // Ideally we should pre-fetch product packaging.
                // For now, let's skip pallet calculation in batch if expensive, or optimize later.
                // Actually, let's keep it simple for now as map usually has few items per bin.
                // Or better: Assume 1 pallet = 1 distinct product-batch if "PALLET" type? 
                // Let's rely on standard query for correctness first.
                const palletPkg = await this.prisma.productPackaging.findFirst({
                    where: { productId: batch.productId, unitType: 'PALLET' }
                });
                if (palletPkg && palletPkg.quantity) {
                    currentPallets += batch.quantity / palletPkg.quantity;
                }
            }
        }

        // 3. Determine Status
        const weightUtil = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
        const volumeUtil = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;
        const palletUtil = maxPallets > 0 ? (currentPallets / maxPallets) * 100 : 0;

        let status: 'EMPTY' | 'PARTIAL' | 'FULL' | 'OVERSIZED' = 'EMPTY';

        if (currentWeight === 0 && currentVolume === 0 && currentPallets === 0) {
            status = 'EMPTY';
        } else if (weightUtil >= 100 || volumeUtil >= 100 || palletUtil >= 100) {
            // Check for overage
            if (weightUtil > 105 || volumeUtil > 105 || palletUtil > 105) {
                status = 'OVERSIZED';
            } else {
                status = 'FULL';
            }
        } else {
            status = 'PARTIAL';
        }

        return {
            status,
            weightUtilisation: Math.round(weightUtil * 100) / 100,
            volumeUtilisation: Math.round(volumeUtil * 100) / 100,
            palletUtilisation: Math.round(palletUtil * 100) / 100,
            details: {
                maxWeight,
                currentWeight: Math.round(currentWeight * 100) / 100,
                maxVolume: Math.round(maxVolume * 1000) / 1000,
                currentVolume: Math.round(currentVolume * 1000) / 1000,
                maxPallets,
                currentPallets: Math.round(currentPallets * 100) / 100
            }
        };
    }

    /**
     * Check if a location can accept incoming inventory without breaching constraints
     */
    async canAccept(
        locationId: string,
        productId: string,
        quantity: number
    ): Promise<{ allowed: boolean; reason?: string }> {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) return { allowed: false, reason: 'Product not found' };

        const report = await this.getLocationUtilisation(locationId);

        // Check Weight
        if (report.details.maxWeight && report.details.maxWeight > 0) {
            const incomingWeight = (product.weight || 0) * quantity;
            if (report.details.currentWeight + incomingWeight > report.details.maxWeight) {
                return { allowed: false, reason: `Exceeds max weight (${report.details.maxWeight}kg)` };
            }
        }

        // Check Volume
        if (report.details.maxVolume && report.details.maxVolume > 0) {
            // mm to m3
            const pVol = ((product.width || 0) * (product.height || 0) * (product.depth || 0)) / 1e9;
            const incomingVolume = pVol * quantity;
            if (report.details.currentVolume + incomingVolume > report.details.maxVolume) {
                return { allowed: false, reason: `Exceeds max volume (${report.details.maxVolume}m³)` };
            }
        }

        // Check Pallets (if constrained)
        if (report.details.maxPallets && report.details.maxPallets > 0) {
            const palletPkg = await this.prisma.productPackaging.findFirst({
                where: { productId, unitType: 'PALLET' }
            });
            // If defined, check against it
            if (palletPkg && palletPkg.quantity) {
                const incomingPallets = quantity / palletPkg.quantity;
                if (report.details.currentPallets + incomingPallets > report.details.maxPallets) {
                    return { allowed: false, reason: `Exceeds max pallet limit` };
                }
            }
        }

        return { allowed: true };
    }
}
