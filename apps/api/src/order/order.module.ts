import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma.service';
import { StrategyModule } from '../strategy/strategy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { ShippingModule } from '../shipping/shipping.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [StrategyModule, InventoryModule, FulfillmentModule, ShippingModule, NotificationModule],
    controllers: [OrderController],
    providers: [OrderService, PrismaService],
})
export class OrderModule { }
