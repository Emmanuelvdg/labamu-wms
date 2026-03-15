import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('barcode')
@UseGuards(PermissionsGuard)
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Get('lookup')
  async lookup(@Query('code') code: string) {
    return this.barcodeService.lookup(code);
  }
}
