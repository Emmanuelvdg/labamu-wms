import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { BarcodeValidatorService } from './barcode-validator.service';

@Controller('barcode')
export class BarcodeController {
    constructor(private readonly barcodeValidator: BarcodeValidatorService) { }

    @Get('lookup')
    async lookupBarcode(@Query('code') code: string) {
        if (!code) throw new BadRequestException('Barcode is required');
        return this.barcodeValidator.lookupBarcode(code);
    }

    @Get('validate')
    async validateScan(
        @Query('code') code: string,
        @Query('contextType') contextType: 'RECEIVE_PO' | 'PICK_TASK' | 'PACK_ORDER' | 'PUTAWAY',
        @Query('referenceId') referenceId: string,
    ) {
        if (!code || !contextType || !referenceId) {
            throw new BadRequestException('code, contextType, and referenceId are required');
        }
        return this.barcodeValidator.validateScan(code, { type: contextType, referenceId });
    }
}
