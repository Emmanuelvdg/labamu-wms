import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WarehouseAreaService, CreateAreaDto, UpdateAreaDto } from './warehouse-area.service';

@Controller('warehouses')
export class WarehouseAreaController {
    constructor(private warehouseAreaService: WarehouseAreaService) { }

    @Get(':id/areas')
    async getAreas(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getAreasForWarehouse(warehouseId);
    }

    @Get(':id/areas/suggested')
    async getSuggestedAreas(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getSuggestedAreas(warehouseId);
    }

    @Get(':id/areas/layout/:type')
    async getSuggestedLayout(
        @Param('id') warehouseId: string,
        @Param('type') layoutType: 'I' | 'U' | 'L'
    ) {
        return this.warehouseAreaService.getSuggestedLayout(warehouseId, layoutType);
    }

    @Post(':id/areas')
    async createArea(
        @Param('id') warehouseId: string,
        @Body() data: CreateAreaDto
    ) {
        return this.warehouseAreaService.createArea(warehouseId, data);
    }

    @Put(':warehouseId/areas/:areaId')
    async updateArea(
        @Param('areaId') areaId: string,
        @Body() data: UpdateAreaDto
    ) {
        return this.warehouseAreaService.updateArea(areaId, data);
    }

    @Delete(':warehouseId/areas/:areaId')
    async deleteArea(@Param('areaId') areaId: string) {
        return this.warehouseAreaService.deleteArea(areaId);
    }
}
