import { Module } from '@nestjs/common';
import { BarcodeValidatorService } from './barcode-validator.service';
import { BarcodeController } from './barcode.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [BarcodeController],
    providers: [BarcodeValidatorService, PrismaService],
    exports: [BarcodeValidatorService],
})
export class CommonFeaturesModule { }
