import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
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
        if (!data.vendorId) throw new BadRequestException('vendorId is required');
        if (!data.issueDate) throw new BadRequestException('issueDate is required');
        if (!data.dueDate) throw new BadRequestException('dueDate is required');
        if (!Array.isArray(data.items) || data.items.length === 0) throw new BadRequestException('items[] is required with at least one entry');
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
