import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';
import { StrategyController } from './strategy.controller';
import { PrismaService } from '../prisma.service';

import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [InventoryModule],
    controllers: [StrategyController],
    providers: [StrategyService, PickingStrategyService, PrismaService],
    exports: [StrategyService, PickingStrategyService],
})
export class StrategyModule { }
