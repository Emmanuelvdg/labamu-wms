import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { CustomerService } from './customer.service';

@Controller('customers')
@UseGuards(PermissionsGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Post()
    @RequirePermission('CUSTOMERS', 'CREATE')
    createCustomer(@Body() data: { name: string; address?: string; latitude?: number; longitude?: number }) {
        return this.customerService.createCustomer(data);
    }

    @Get()
    @RequirePermission('CUSTOMERS', 'READ')
    getCustomers() {
        return this.customerService.getCustomers();
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
