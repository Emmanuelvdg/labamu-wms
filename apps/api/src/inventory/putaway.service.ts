import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PutawayService {
    constructor(private prisma: PrismaService) { }

    /**
     * Finds the best location for a product based on Velocity and Zone Priority.
     * Velocity A (Fast) -> Low Zone Priority (e.g. 1, Golden Zone)
     * Velocity C (Slow) -> High Zone Priority (e.g. 100, Back of Warehouse)
     */
    async findBestLocation(productId: string, quantity: number, warehouseId: string) {
        // 1. Get Product Details
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        // 2. Get All Internal Locations in Warehouse
        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                type: 'INTERNAL',
                // Optional: Filter by capacity if we tracked it rigorously
            },
            orderBy: [
                { zonePriority: 'asc' },
                { putawaySequence: 'asc' }
            ]
        });

        if (locations.length === 0) return null;

        // 3. Logic: Match Velocity to Zone
        // Simple Heuristic:
        // A -> Priority <= 10
        // B -> Priority <= 50
        // C -> Priority > 50 (or any)
        // ...

        let candidateLocations = locations;

        if (product.velocity === 'A') {
            // Prefer Golden Zones
            candidateLocations = locations.filter(l => l.zonePriority <= 20);
            if (candidateLocations.length === 0) candidateLocations = locations; // Fallback
        } else if (product.velocity === 'C') {
            // Prefer deeper zones to save Golden Zones for A items
            // But don't strictly forbid Golden Zones if only space available
            const slowZones = locations.filter(l => l.zonePriority > 50);
            if (slowZones.length > 0) candidateLocations = slowZones;
        }

        // 4. Return the best one (First in sequence)
        return candidateLocations[0];
    }
}
