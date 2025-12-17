import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) { }

    @Post()
    createInvoice(@Body() data: any) {
        return this.invoiceService.createInvoice({
            ...data,
            issueDate: new Date(data.issueDate),
            dueDate: new Date(data.dueDate),
        });
    }

    @Get()
    getInvoices() {
        return this.invoiceService.getInvoices();
    }

    @Get(':id')
    getInvoice(@Param('id') id: string) {
        return this.invoiceService.getInvoice(id);
    }

    @Post(':id/match')
    matchInvoice(@Param('id') id: string) {
        return this.invoiceService.matchInvoice(id);
    }
}
