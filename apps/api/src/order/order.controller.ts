import { Controller, Post, Body, Get, Param, Put, UseGuards, Delete } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    @RequirePermission('ORDERS', 'CREATE')
    createOrder(@Body() data: CreateOrderDto) {
        return this.orderService.createOrder(data);
    }

    @Get()
    @RequirePermission('ORDERS', 'READ')
    getOrders() {
        return this.orderService.getOrders();
    }

    @Get(':id')
    @RequirePermission('ORDERS', 'READ')
    getOrder(@Param('id') id: string) {
        return this.orderService.getOrder(id);
    }

    @Post('ship')
    @RequirePermission('ORDERS', 'UPDATE')
    createShipment(@Body() data: { orderId: string; carrier: string; trackingId: string }) {
        return this.orderService.createShipment(data);
    }

    @Post(':id/check-availability')
    @RequirePermission('ORDERS', 'UPDATE')
    checkAvailability(@Param('id') id: string) {
        return this.orderService.checkAvailability(id);
    }

    @Post(':id/cancel')
    @RequirePermission('ORDERS', 'UPDATE')
    cancelOrder(@Param('id') id: string) {
        return this.orderService.cancelOrder(id);
    }

    @Put(':id')
    @RequirePermission('ORDERS', 'UPDATE')
    updateOrder(@Param('id') id: string, @Body() data: any) {
        return this.orderService.updateOrder(id, data);
    }

    @Delete(':id')
    @RequirePermission('ORDERS', 'DELETE')
    deleteOrder(@Param('id') id: string) {
        return this.orderService.deleteOrder(id);
    }
}
