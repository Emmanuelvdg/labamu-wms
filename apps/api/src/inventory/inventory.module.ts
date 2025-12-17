import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';

import { PackagingService } from './packaging.service';

@Module({
    controllers: [InventoryController],
    providers: [InventoryService, PrismaService, PackagingService],
    exports: [InventoryService, PackagingService],
})
export class InventoryModule { }
