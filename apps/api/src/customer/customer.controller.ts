import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Post()
    createCustomer(@Body() data: { name: string; address?: string; latitude?: number; longitude?: number }) {
        return this.customerService.createCustomer(data);
    }

    @Get()
    getCustomers() {
        return this.customerService.getCustomers();
    }

    @Get(':id')
    getCustomer(@Param('id') id: string) {
        return this.customerService.getCustomer(id);
    }
}
