import { Controller, Get, Post, Param, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrintingService } from './printing.service';
import { FeatureFlagGuard, RequireFlag } from '../common/guards/feature-flag.guard';

@Controller('printing')
@UseGuards(FeatureFlagGuard)
@RequireFlag('BARCODE_PRINT')
export class PrintingController {
    constructor(private readonly printingService: PrintingService) {}

    // ── Location labels ───────────────────────────────────────────────────────

    @Get('location/:id/pdf')
    async locationPdf(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.printingService.generateLocationLabel(id);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=location-${id}.pdf`, 'Content-Length': buffer.length });
        res.end(buffer);
    }

    @Get('location/:id/zpl')
    async locationZpl(@Param('id') id: string, @Res() res: Response) {
        const zpl = await this.printingService.generateLocationZpl(id);
        res.set({ 'Content-Type': 'application/x-zpl', 'Content-Disposition': `attachment; filename=location-${id}.zpl` });
        res.send(zpl);
    }

    // ── Product labels ────────────────────────────────────────────────────────

    @Get('product/:id/pdf')
    async productPdf(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.printingService.generateItemLabel(id);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=product-${id}.pdf`, 'Content-Length': buffer.length });
        res.end(buffer);
    }

    @Get('product/:id/zpl')
    async productZpl(@Param('id') id: string, @Res() res: Response) {
        const zpl = await this.printingService.generateProductZpl(id);
        res.set({ 'Content-Type': 'application/x-zpl', 'Content-Disposition': `attachment; filename=product-${id}.zpl` });
        res.send(zpl);
    }

    // ── Lot (InventoryBatch) labels ───────────────────────────────────────────

    @Get('lot/:id/pdf')
    async lotPdf(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.printingService.generateLotLabel(id);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=lot-${id}.pdf`, 'Content-Length': buffer.length });
        res.end(buffer);
    }

    @Get('lot/:id/zpl')
    async lotZpl(@Param('id') id: string, @Res() res: Response) {
        const zpl = await this.printingService.generateLotZpl(id);
        res.set({ 'Content-Type': 'application/x-zpl', 'Content-Disposition': `attachment; filename=lot-${id}.zpl` });
        res.send(zpl);
    }

    // ── Print queue ───────────────────────────────────────────────────────────

    @Post('queue')
    queue(@Body() body: { entityType: 'product' | 'location' | 'lot'; entityId: string; format?: 'pdf' | 'zpl' | 'png'; printerId?: string; copies?: number }) {
        return this.printingService.processQueueJob(body);
    }

    // ── Batch printing ────────────────────────────────────────────────────────

    @Post('batch')
    async batch(
        @Body() body: { items: Array<{ type: 'product' | 'location'; id: string }>; format?: 'pdf' | 'zpl' },
        @Res() res: Response,
    ) {
        const format = body.format ?? 'pdf';

        if (format === 'zpl') {
            const zpl = await this.printingService.generateBatchZpl(body.items);
            res.set({ 'Content-Type': 'application/x-zpl', 'Content-Disposition': 'attachment; filename=batch-labels.zpl' });
            res.send(zpl);
        } else {
            const buffer = await this.printingService.generateBatchPdf(body.items);
            res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=batch-labels.pdf', 'Content-Length': buffer.length });
            res.end(buffer);
        }
    }
}
