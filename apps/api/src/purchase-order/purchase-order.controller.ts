import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { PurchaseOrderService } from './purchase-order.service';

@Controller('purchase-orders')
@UseGuards(PermissionsGuard)
export class PurchaseOrderController {
    constructor(private readonly purchaseOrderService: PurchaseOrderService) { }

    @Post()
    @RequirePermission('PURCHASE_ORDERS', 'CREATE')
    create(@Body() data: { supplierId: string; expectedDate?: Date; items: { productId: string; quantity: number; unitCost: number }[] }) {
        return this.purchaseOrderService.createPurchaseOrder(data);
    }

    @Get()
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    findAll() {
        return this.purchaseOrderService.getPurchaseOrders();
    }

    @Get('suppliers')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getSuppliers() {
        return this.purchaseOrderService.getSuppliers();
    }

    @Get(':id')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    findOne(@Param('id') id: string) {
        return this.purchaseOrderService.getPurchaseOrder(id);
    }

    @Get(':id/receipts')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getReceipts(@Param('id') id: string) {
        return this.purchaseOrderService.getReceipts(id);
    }

    @Post(':id/receive')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    receive(@Param('id') id: string, @Body() data: { destinationLocationId: string; itemsToReceive?: { poItemId: string; quantity: number }[] }) {
        return this.purchaseOrderService.receiveGoods(id, data.destinationLocationId, data.itemsToReceive);
    }

    @Post(':id/submit')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    submit(@Param('id') id: string) {
        return this.purchaseOrderService.submitForApproval(id);
    }

    @Post(':id/approve')
    @RequirePermission('PURCHASE_ORDERS', 'APPROVE')
    approve(@Param('id') id: string, @Body() data: { userId: string }) {
        return this.purchaseOrderService.approvePurchaseOrder(id, data.userId);
    }

    @Post(':id/reject')
    @RequirePermission('PURCHASE_ORDERS', 'APPROVE')
    reject(@Param('id') id: string, @Body() data: { userId: string; reason: string }) {
        return this.purchaseOrderService.rejectPurchaseOrder(id, data.userId, data.reason);
    }
}
