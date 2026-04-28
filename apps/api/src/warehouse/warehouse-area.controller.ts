import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { WarehouseAreaService, CreateAreaDto, UpdateAreaDto, UpdateFloorPlanDto } from './warehouse-area.service';
import { PrismaService } from '../prisma.service';
import { FeatureFlagGuard, RequireFlag } from '../common/guards/feature-flag.guard';

@Controller('warehouses')
export class WarehouseAreaController {
    constructor(
        private warehouseAreaService: WarehouseAreaService,
        private prisma: PrismaService
    ) { }

    @Get()
    async getAllWarehouses() {
        return this.prisma.warehouse.findMany({
            select: {
                id: true,
                name: true,
                shortName: true,
                address: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                latitude: true,
                longitude: true,
                type: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    @Get(':id')
    async getWarehouse(@Param('id') id: string) {
        return this.prisma.warehouse.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                shortName: true,
                address: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                latitude: true,
                longitude: true,
                type: true,
                floorPlanShape: true,
                viewLocationId: true,
                floorPlanVertices: true,
                floorPlanWidth: true,
                floorPlanHeight: true,
                gridEnabled: true,
                gridSize: true,
                snapToGrid: true,
            },
        });
    }

    @Patch(':id')
    async updateWarehouse(@Param('id') id: string, @Body() data: any) {
        return this.warehouseAreaService.updateWarehouse(id, data);
    }

    @Get(':id/areas')
    async getAreas(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getAreasForWarehouse(warehouseId);
    }

    @Get(':id/areas/suggested')
    async getSuggestedAreas(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getSuggestedAreas(warehouseId);
    }

    @Get(':id/bins/utilization')
    async getBinUtilization(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getBinUtilization(warehouseId);
    }

    @Get(':id/zones')
    async getZones(@Param('id') warehouseId: string) {
        return this.warehouseAreaService.getZones(warehouseId);
    }

    @Get(':id/areas/layout/:type')
    async getSuggestedLayout(
        @Param('id') warehouseId: string,
        @Param('type') layoutType: 'I' | 'U' | 'L'
    ) {
        return this.warehouseAreaService.getSuggestedLayout(warehouseId, layoutType);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('BETA_FLOOR_PLAN')
    @Post(':id/areas')
    async createArea(
        @Param('id') warehouseId: string,
        @Body() data: CreateAreaDto
    ) {
        return this.warehouseAreaService.createArea(warehouseId, data);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('BETA_FLOOR_PLAN')
    @Put(':warehouseId/areas/:areaId')
    async updateArea(
        @Param('areaId') areaId: string,
        @Body() data: UpdateAreaDto
    ) {
        return this.warehouseAreaService.updateArea(areaId, data);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('BETA_FLOOR_PLAN')
    @Delete(':warehouseId/areas/:areaId')
    async deleteArea(@Param('areaId') areaId: string) {
        return this.warehouseAreaService.deleteArea(areaId);
    }

    @UseGuards(FeatureFlagGuard)
    @RequireFlag('BETA_FLOOR_PLAN')
    @Patch(':id/floor-plan')
    async updateFloorPlan(
        @Param('id') warehouseId: string,
        @Body() data: UpdateFloorPlanDto
    ) {
        return this.warehouseAreaService.updateFloorPlan(warehouseId, data);
    }
    @Get(':id/dependencies')
    async checkDependencies(@Param('id') id: string) {
        return this.warehouseAreaService.checkWarehouseDependencies(id);
    }

    @Delete(':id')
    async deleteWarehouse(@Param('id') id: string) {
        return this.warehouseAreaService.deleteWarehouse(id);
    }
}
