import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, Query } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { CustomerService } from './customer.service';
import { parsePagination } from '../common/pagination';

@Controller('customers')
@UseGuards(PermissionsGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Post('bulk')
    @RequirePermission('CUSTOMERS', 'CREATE')
    bulkCreateCustomers(@Body() data: { items: { name: string; address?: string; latitude?: number; longitude?: number }[] }) {
        return this.customerService.bulkCreateCustomers(data.items);
    }

    @Post()
    @RequirePermission('CUSTOMERS', 'CREATE')
    createCustomer(@Body() data: { name: string; address?: string; latitude?: number; longitude?: number }) {
        return this.customerService.createCustomer(data);
    }

    @Get()
    @RequirePermission('CUSTOMERS', 'READ')
    getCustomers(
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const { take, skip } = parsePagination(limit, offset);
        return this.customerService.getCustomers(take, skip);
    }

    @Get(':id')
    @RequirePermission('CUSTOMERS', 'READ')
    getCustomer(@Param('id') id: string) {
        return this.customerService.getCustomer(id);
    }

    @Patch(':id')
    @RequirePermission('CUSTOMERS', 'UPDATE')
    updateCustomer(@Param('id') id: string, @Body() data: any) {
        return this.customerService.updateCustomer(id, data);
    }

    @Delete(':id')
    @RequirePermission('CUSTOMERS', 'DELETE')
    deleteCustomer(@Param('id') id: string) {
        return this.customerService.deleteCustomer(id);
    }
}
