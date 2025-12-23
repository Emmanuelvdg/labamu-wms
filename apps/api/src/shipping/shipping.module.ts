import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ShippingController],
    providers: [ShippingService, PrismaService],
    exports: [ShippingService],
})
export class ShippingModule { }
