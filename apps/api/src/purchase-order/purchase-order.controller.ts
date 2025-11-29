import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';

@Controller('purchase-orders')
export class PurchaseOrderController {
    constructor(private readonly purchaseOrderService: PurchaseOrderService) { }

    @Post()
    create(@Body() data: { supplierId: string; expectedDate?: Date; items: { productId: string; quantity: number; unitCost: number }[] }) {
        return this.purchaseOrderService.createPurchaseOrder(data);
    }

    @Get()
    findAll() {
        return this.purchaseOrderService.getPurchaseOrders();
    }

    @Post(':id/receive')
    receive(@Param('id') id: string, @Body() data: { destinationLocationId: string }) {
        return this.purchaseOrderService.receiveGoods(id, data.destinationLocationId);
    }
}
