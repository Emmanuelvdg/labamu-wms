import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CycleCountService {
    private readonly logger = new Logger(CycleCountService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Generate cycle count tasks for all locations matching a specific zone/metadata string
     */
    async generateZoneCycleCount(warehouseId: string, zonePattern: string, workerId?: string) {
        this.logger.log(`Generating cycle count for warehouse ${warehouseId}, zone: ${zonePattern}`);

        // Find locations that belong to the zone (by name or type)
        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                OR: [
                    { name: { contains: zonePattern } },
                    { type: { contains: zonePattern } }
                ]
            }
        });

        if (locations.length === 0) {
            return { message: 'No locations found for this zone pattern', tasks: [] };
        }

        const locationIds = locations.map(l => l.id);

        // Find current inventory in those locations
        const inventoryRecords = await this.prisma.productInventory.findMany({
            where: { locationId: { in: locationIds } },
            include: { product: true, location: true }
        });

        return {
            message: `Found ${inventoryRecords.length} inventory records across ${locations.length} locations in zone ${zonePattern}`,
            expectedCounts: inventoryRecords.map(inv => ({
                inventoryId: inv.id,
                locationId: inv.locationId,
                locationName: inv.location.name,
                productId: inv.productId,
                productName: inv.product.name,
                expectedQuantity: inv.quantity
            }))
        };
    }
}
