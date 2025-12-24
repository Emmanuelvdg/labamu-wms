import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WarehouseAreaController } from './warehouse-area.controller';
import { WarehouseAreaService } from './warehouse-area.service';

@Module({
    controllers: [WarehouseAreaController],
    providers: [PrismaService, WarehouseAreaService],
    exports: [WarehouseAreaService],
})
export class WarehouseModule { }
