import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
    constructor(private readonly routingService: RoutingService) { }

    @Get('distance')
    async getDistance(
        @Query('sourceLocationId') sourceLocationId: string,
        @Query('destinationLocationId') destinationLocationId: string,
        @Query('warehouseId') warehouseId: string
    ) {
        if (!sourceLocationId || !destinationLocationId) {
            throw new BadRequestException('sourceLocationId and destinationLocationId are required');
        }
        return this.routingService.getDistance(sourceLocationId, destinationLocationId, warehouseId);
    }
}
