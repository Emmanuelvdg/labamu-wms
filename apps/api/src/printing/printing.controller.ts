import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrintingService } from './printing.service';

@Controller('printing')
export class PrintingController {
    constructor(private readonly printingService: PrintingService) { }

    @Get('location/:id/pdf')
    async printLocationLabel(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.printingService.generateLocationLabel(id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=location-${id}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    @Get('product/:id/pdf')
    async printProductLabel(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.printingService.generateItemLabel(id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=product-${id}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
