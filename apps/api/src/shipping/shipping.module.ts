import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { ShippingDocsService } from './shipping-docs.service';
import { CarrierIntegrationService } from './carrier-integration.service';
import {  } from '../prisma.service';

@Module({
    controllers: [ShippingController],
    providers: [ShippingService, ShippingDocsService, CarrierIntegrationService],
    exports: [ShippingService, ShippingDocsService, CarrierIntegrationService]
})
export class ShippingModule { }
