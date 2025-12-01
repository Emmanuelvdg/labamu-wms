import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SupplierService } from './supplier.service';

@Controller('suppliers')
export class SupplierController {
    constructor(private readonly supplierService: SupplierService) { }

    @Post()
    create(@Body() data: { name: string; contactInfo?: string }) {
        return this.supplierService.create(data);
    }

    @Get()
    findAll() {
        return this.supplierService.findAll();
    }

    @Get('reports/price-history')
    getProductPriceHistory(@Query('productId') productId: string) {
        return this.supplierService.getProductPriceHistory(productId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const supplier = await this.supplierService.findOne(id);
        const stats = await this.supplierService.getSupplierStats(id);
        return { ...supplier, stats };
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; contactInfo?: string }) {
        return this.supplierService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.supplierService.remove(id);
    }

    @Get(':id/orders')
    getOrders(@Param('id') id: string) {
        return this.supplierService.getSupplierOrders(id);
    }
}
