import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RoutingService {
    private readonly logger = new Logger(RoutingService.name);

    constructor(private prisma: PrismaService) {}

    async getDistance(
        sourceLocationId: string, 
        destinationLocationId: string, 
        warehouseId: string
    ): Promise<{ distanceMeters: number, sourceName: string, destName: string }> {
        // Fetch locations and their functional area links to get X/Y coords
        const sourceLoc = await this.prisma.location.findUnique({
            where: { id: sourceLocationId },
            include: { functionalArea: true }
        });

        const destLoc = await this.prisma.location.findUnique({
            where: { id: destinationLocationId },
            include: { functionalArea: true }
        });

        if (!sourceLoc || !destLoc) {
            throw new BadRequestException('One or both locations not found');
        }

        // To calculate distance, we need coordinates. 
        // If a location has native X/Y (Layer 2/3), use them. 
        // Otherwise, fallback to the linked functional area X/Y (Layer 1).
        const getCoord = (loc: any) => {
            if (loc.x !== null && loc.x !== undefined && loc.y !== null && loc.y !== undefined) {
                // Adjust if loc.x is 0 and it has functional area we might want to use area, 
                // but usually layer 2/3 has coords directly. Let's prefer native coords if > 0 or functionalArea missing.
                if ((loc.x !== 0 || loc.y !== 0) || !loc.functionalArea) {
                    return { x: loc.x, y: loc.y };
                }
            }
            if (loc.functionalArea) {
                // Use Center of functional area
                return { 
                    x: loc.functionalArea.x + (loc.functionalArea.width / 2),
                    y: loc.functionalArea.y + (loc.functionalArea.height / 2)
                };
            }
            return { x: 0, y: 0 };
        };

        const pt1 = getCoord(sourceLoc);
        const pt2 = getCoord(destLoc);

        // Euclidean straight-line distance
        const dx = pt2.x - pt1.x;
        const dy = pt2.y - pt1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return {
            distanceMeters: Math.round(distance * 10) / 10,
            sourceName: sourceLoc.name,
            destName: destLoc.name
        };
    }
}
