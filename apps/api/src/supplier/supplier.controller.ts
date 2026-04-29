import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { SupplierService } from './supplier.service';

@Controller('suppliers')
@UseGuards(PermissionsGuard)
export class SupplierController {
    constructor(private readonly supplierService: SupplierService) { }

    @Post()
    @RequirePermission('SUPPLIERS', 'CREATE')
    create(@Body() data: { name: string; contactInfo?: string }) {
        return this.supplierService.create(data);
    }

    @Get()
    @RequirePermission('SUPPLIERS', 'READ')
    findAll() {
        return this.supplierService.findAll();
    }

    @Get('reports/price-history')
    @RequirePermission('REPORTS', 'READ')
    getProductPriceHistory(@Query('productId') productId: string) {
        return this.supplierService.getProductPriceHistory(productId);
    }

    @Get(':id')
    @RequirePermission('SUPPLIERS', 'READ')
    async findOne(@Param('id') id: string) {
        const supplier = await this.supplierService.findOne(id);
        const stats = await this.supplierService.getSupplierStats(id);
        return { ...supplier, stats };
    }

    @Patch(':id')
    @RequirePermission('SUPPLIERS', 'UPDATE')
    update(@Param('id') id: string, @Body() data: { name?: string; contactInfo?: string }) {
        return this.supplierService.update(id, data);
    }

    @Delete(':id')
    @RequirePermission('SUPPLIERS', 'DELETE')
    remove(@Param('id') id: string) {
        return this.supplierService.remove(id);
    }

    @Get(':id/orders')
    @RequirePermission('SUPPLIERS', 'READ')
    getOrders(@Param('id') id: string) {
        return this.supplierService.getSupplierOrders(id);
    }

    @Post(':id/invite')
    @RequirePermission('SUPPLIERS', 'UPDATE')
    invite(@Param('id') id: string, @Body() body: { email: string }) {
        return this.supplierService.createInvitation(id, body.email);
    }
}
