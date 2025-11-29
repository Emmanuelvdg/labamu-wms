import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma.service';
import { StrategyModule } from '../strategy/strategy.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [StrategyModule, InventoryModule],
    controllers: [OrderController],
    providers: [OrderService, PrismaService],
})
export class OrderModule { }
