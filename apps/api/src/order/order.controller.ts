import { Controller, Post, Body, Get } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    createOrder(@Body() data: { customerId: string; priority: string; items: { productId: string; quantity: number }[] }) {
        return this.orderService.createOrder(data);
    }

    @Get()
    getOrders() {
        return this.orderService.getOrders();
    }

    @Post('ship')
    createShipment(@Body() data: { orderId: string; carrier: string; trackingId: string }) {
        return this.orderService.createShipment(data);
    }
}
