import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    createOrder(@Body() data: { customerId: string; priority: string; items: { productId: string; quantity: number }[]; expectedDate?: Date; warehouseId?: string }) {
        return this.orderService.createOrder(data);
    }

    @Get()
    getOrders() {
        return this.orderService.getOrders();
    }

    @Get(':id')
    getOrder(@Param('id') id: string) {
        return this.orderService.getOrder(id);
    }

    @Post('ship')
    createShipment(@Body() data: { orderId: string; carrier: string; trackingId: string }) {
        return this.orderService.createShipment(data);
    }
}
