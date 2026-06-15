import { Module } from '@nestjs/common';
import { BarcodeValidatorService } from './barcode-validator.service';
import { BarcodeController } from './barcode.controller';
import {  } from '../prisma.service';

@Module({
    controllers: [BarcodeController],
    providers: [BarcodeValidatorService],
    exports: [BarcodeValidatorService],
})
export class CommonFeaturesModule { }
