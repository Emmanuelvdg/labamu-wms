import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('routing')
@UseGuards(PermissionsGuard)
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
