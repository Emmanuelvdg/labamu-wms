import { Controller, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { DeliveryMethodsController } from './delivery-methods.controller';
import { PrismaService } from '../prisma.service';
import { ShippingService } from '../shipping/shipping.service';

@Controller('delivery-methods')
export class DeliveryMethodsAliasController extends DeliveryMethodsController {
    constructor(prisma: PrismaService, private shippingService: ShippingService) {
        super(prisma);
    }

    @Post()
    create(@Body() data: any) {
        return this.shippingService.createDeliveryMethod(data);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.shippingService.updateDeliveryMethod(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.shippingService.deleteDeliveryMethod(id);
    }
}
