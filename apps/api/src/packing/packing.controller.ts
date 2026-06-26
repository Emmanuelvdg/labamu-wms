import { Controller, Get, Post, Param, Body, Query, Delete, UseGuards } from '@nestjs/common';
import { PackingService } from './packing.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';

@Controller('packing')
@UseGuards(PermissionsGuard)
export class PackingController {
    constructor(private readonly packingService: PackingService) { }

    @Get('sessions')
    async listSessions(@Query('orderId') orderId?: string) {
        return this.packingService.listSessions(orderId);
    }

    /**
     * GET /packing/queue - List orders awaiting packing
     */
    @Get('queue')
    async getPackingQueue(@Query('warehouseId') warehouseId?: string) {
        return this.packingService.getPackingQueue(warehouseId);
    }

    /**
     * POST /packing/sessions - Create a packing session for an order
     */
    @Post('sessions')
    async createSession(@Body() body: { orderId: string; workerId?: string }) {
        return this.packingService.createSession(body.orderId, body.workerId);
    }

    /**
     * GET /packing/sessions/:id - Get session details with progress
     */
    @Get('sessions/:id')
    async getSession(@Param('id') id: string) {
        return this.packingService.getSession(id);
    }

    /**
     * GET /packing/sessions/order/:orderId - Get session by order ID
     */
    @Get('sessions/order/:orderId')
    async getSessionByOrder(@Param('orderId') orderId: string) {
        return this.packingService.getSessionByOrder(orderId);
    }

    /**
     * POST /packing/sessions/:id/scan - Scan/verify an item barcode
     */
    @Post('sessions/:id/scan')
    async scanItem(@Param('id') id: string, @Body() body: { barcode: string }) {
        return this.packingService.scanItem(id, body.barcode);
    }

    /**
     * POST /packing/sessions/:id/parcels - Create a parcel with items
     */
    @Post('sessions/:id/parcels')
    async createParcel(
        @Param('id') id: string,
        @Body() body: {
            weight?: number;
            length?: number;
            width?: number;
            height?: number;
            trackingNumber?: string;
            items: { productId: string; quantity: number }[];
        },
    ) {
        return this.packingService.createParcel(id, body);
    }

    /**
     * DELETE /packing/parcels/:id - Remove a parcel
     */
    @Delete('parcels/:id')
    async removeParcel(@Param('id') id: string) {
        return this.packingService.removeParcel(id);
    }

    /**
     * POST /packing/sessions/:id/complete - Complete packing session
     */
    @Post('sessions/:id/complete')
    async completeSession(@Param('id') id: string) {
        return this.packingService.completeSession(id);
    }
}
