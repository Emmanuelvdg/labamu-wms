import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PrinterConfigService, CreatePrinterConfigDto } from './printer-config.service';
import { FeatureFlagGuard, RequireFlag } from '../common/guards/feature-flag.guard';

@Controller('printing/printers')
@UseGuards(FeatureFlagGuard)
@RequireFlag('BARCODE_PRINT')
export class PrinterConfigController {
    constructor(private readonly service: PrinterConfigService) {}

    @Get()
    list() { return this.service.list(); }

    @Post()
    create(@Body() dto: CreatePrinterConfigDto) { return this.service.create(dto); }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: Partial<CreatePrinterConfigDto>) {
        return this.service.update(id, dto);
    }

    @Patch(':id/default')
    setDefault(@Param('id') id: string) { return this.service.setDefault(id); }

    @Delete(':id')
    remove(@Param('id') id: string) { return this.service.remove(id); }
}
