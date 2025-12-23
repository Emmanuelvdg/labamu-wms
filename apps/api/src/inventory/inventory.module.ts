import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';

import { PackagingService } from './packaging.service';
import { PutawayService } from './putaway.service';
import { RotationRuleResolverService } from './rotation-rule-resolver.service';

@Module({
    controllers: [InventoryController],
    providers: [InventoryService, PutawayService, RotationRuleResolverService, PackagingService, PrismaService],
    exports: [InventoryService, PutawayService, RotationRuleResolverService, PackagingService],
})
export class InventoryModule { }
