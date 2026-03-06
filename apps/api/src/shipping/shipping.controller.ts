import { Controller, Post, Body, Get, Param, Put, Query, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import { ShippingService } from './shipping.service';
import { ShippingDocsService } from './shipping-docs.service';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { CarrierIntegrationService } from './carrier-integration.service';

@Controller('shipping')
export class ShippingController {
    constructor(
        private readonly shippingService: ShippingService,
        private readonly shippingDocsService: ShippingDocsService,
        private readonly carrierService: CarrierIntegrationService,
    ) { }

    @Get('rates')
    @RequirePermission('SHIPPING', 'READ')
    async getRates(
        @Query('originZip') originZip: string,
        @Query('destZip') destZip: string,
        @Query('weightKg') weightKg: string
    ) {
        return this.carrierService.getRates(
            originZip || '00000',
            destZip || '00000',
            weightKg ? parseFloat(weightKg) : 1
        );
    }

    @Get('methods')
    getMethods(@Query('active') active: string) {
        return this.shippingService.getDeliveryMethods(active !== 'false');
    }

    @Get('methods/:id')
    getMethod(@Param('id') id: string) {
        return this.shippingService.getDeliveryMethod(id);
    }

    @Post('methods')
    createMethod(@Body() data: any) {
        return this.shippingService.createDeliveryMethod(data);
    }

    @Put('methods/:id')
    updateMethod(@Param('id') id: string, @Body() data: any) {
        return this.shippingService.updateDeliveryMethod(id, data);
    }

    @Delete('methods/:id')
    deleteMethod(@Param('id') id: string) {
        return this.shippingService.deleteDeliveryMethod(id);
    }

    @Post('calculate')
    calculate(@Body() body: { methodId: string; weight: number; volume: number; price: number }) {
        return this.shippingService.calculateCost(body.methodId, body);
    }

    @Get('label/:shipmentId')
    async getShippingLabel(@Param('shipmentId') shipmentId: string, @Res() res: Response) {
        const buffer = await this.shippingDocsService.generateShippingLabel(shipmentId);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="label-${shipmentId}.pdf"` });
        res.send(buffer);
    }

    @Get('packing-slip/:orderId')
    async getPackingSlip(@Param('orderId') orderId: string, @Res() res: Response) {
        const buffer = await this.shippingDocsService.generatePackingSlip(orderId);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="packing-slip-${orderId}.pdf"` });
        res.send(buffer);
    }

    @Post('manifest')
    async getManifest(@Body() body: { shipmentIds: string[] }, @Res() res: Response) {
        const buffer = await this.shippingDocsService.generateManifest(body.shipmentIds);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="manifest.pdf"' });
        res.send(buffer);
    }
}
