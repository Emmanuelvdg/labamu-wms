
import { Module } from '@nestjs/common';
import { StocktakingController } from './stocktaking.controller';
import { StocktakingService } from './stocktaking.service';
import {  } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    controllers: [StocktakingController],
    providers: [StocktakingService],
    imports: [InventoryModule],
})
export class StocktakingModule { }
