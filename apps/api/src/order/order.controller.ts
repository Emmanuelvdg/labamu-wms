import { Controller, Post, Body, Get, Param, Put, Patch, UseGuards, Delete, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { OrderService } from './order.service';
import { ExcelService } from '../common/excel/excel.service';
import { parsePagination } from '../common/pagination';

@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService, private readonly excelService: ExcelService) { }

    @Post()
    @RequirePermission('ORDERS', 'CREATE')
    createOrder(@Body() data: CreateOrderDto) {
        return this.orderService.createOrder(data);
    }

    @Get()
    @RequirePermission('ORDERS', 'READ')
    async getOrders(
        @Query('status') status?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('format') format?: string,
        @Res({ passthrough: true }) res?: Response,
    ) {
        if (format === 'xlsx') {
            const result = await this.orderService.getOrders(status, 10000, 0) as any;
            const rows = (result.data ?? []).map((o: any) => ({
                id:        o.id,
                createdAt: new Date(o.createdAt).toLocaleString(),
                status:    o.status,
                warehouse: o.warehouse?.name ?? '',
                itemCount: o.items?.length ?? 0,
                totalQty:  o.items?.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0) ?? 0,
                shipmentCarrier: o.shipment?.carrier ?? '',
                trackingId:      o.shipment?.trackingId ?? '',
            }));
            const buffer = await this.excelService.buildBuffer('Orders', [
                { header: 'Order ID',        key: 'id',              width: 36 },
                { header: 'Created At',      key: 'createdAt',       width: 22 },
                { header: 'Status',          key: 'status',          width: 14 },
                { header: 'Warehouse',       key: 'warehouse',       width: 20 },
                { header: 'Line Items',      key: 'itemCount',       width: 12 },
                { header: 'Total Qty',       key: 'totalQty',        width: 12 },
                { header: 'Carrier',         key: 'shipmentCarrier', width: 16 },
                { header: 'Tracking ID',     key: 'trackingId',      width: 22 },
            ], rows);
            res!.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="orders.xlsx"', 'Content-Length': buffer.length });
            res!.end(buffer);
            return;
        }
        const { take, skip } = parsePagination(limit, offset);
        return this.orderService.getOrders(status, take, skip);
    }

    @Get(':id')
    @RequirePermission('ORDERS', 'READ')
    getOrder(@Param('id') id: string) {
        return this.orderService.getOrder(id);
    }

    @Post('ship')
    @RequirePermission('ORDERS', 'UPDATE')
    createShipment(@Body() data: { orderId: string; carrier: string; trackingId: string }, @Req() req: any) {
        return this.orderService.createShipment({ ...data, actor: { id: req.user?.id, email: req.user?.email, companyId: req.user?.companyId } });
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
    updateOrder(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.orderService.updateOrder(id, data, { id: req.user?.id, email: req.user?.email, companyId: req.user?.companyId });
    }

    @Patch(':id')
    @RequirePermission('ORDERS', 'UPDATE')
    patchOrder(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.orderService.updateOrder(id, data, { id: req.user?.id, email: req.user?.email, companyId: req.user?.companyId });
    }

    @Delete(':id')
    @RequirePermission('ORDERS', 'DELETE')
    deleteOrder(@Param('id') id: string) {
        return this.orderService.deleteOrder(id);
    }
}
