
import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [InventoryModule],
    controllers: [ReturnsController],
    providers: [ReturnsService, PrismaService],
})
export class ReturnsModule { }
