import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
@UseGuards(PermissionsGuard)
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) { }

    @Post()
    @RequirePermission('INVOICES', 'CREATE')
    createInvoice(@Body() data: any) {
        return this.invoiceService.createInvoice({
            ...data,
            issueDate: new Date(data.issueDate),
            dueDate: new Date(data.dueDate),
        });
    }

    @Get()
    @RequirePermission('INVOICES', 'READ')
    getInvoices() {
        return this.invoiceService.getInvoices();
    }

    @Get(':id')
    @RequirePermission('INVOICES', 'READ')
    getInvoice(@Param('id') id: string) {
        return this.invoiceService.getInvoice(id);
    }

    @Post(':id/match')
    @RequirePermission('INVOICES', 'UPDATE')
    matchInvoice(@Param('id') id: string) {
        return this.invoiceService.matchInvoice(id);
    }
}
