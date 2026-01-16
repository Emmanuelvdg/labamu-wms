
import { Module } from '@nestjs/common';
import { StocktakingController } from './stocktaking.controller';
import { StocktakingService } from './stocktaking.service';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    controllers: [StocktakingController],
    providers: [StocktakingService, PrismaService],
    imports: [InventoryModule],
})
export class StocktakingModule { }
