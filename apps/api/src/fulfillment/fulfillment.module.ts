import { Module } from '@nestjs/common';
import { FulfillmentController } from './fulfillment.controller';
import { FulfillmentService } from './fulfillment.service';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [InventoryModule],
    controllers: [FulfillmentController],
    providers: [FulfillmentService, PrismaService],
    exports: [FulfillmentService],
})
export class FulfillmentModule { }
