import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

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
}
