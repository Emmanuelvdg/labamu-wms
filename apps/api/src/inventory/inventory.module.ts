import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';

import { PackagingService } from './packaging.service';
import { PutawayService } from './putaway.service';
import { PutawayController } from './putaway.controller';
import { RotationRuleResolverService } from './rotation-rule-resolver.service';
import { StockMoveService } from './stock-move.service';
import { UtilisationService } from './utilisation.service';

@Module({
    controllers: [InventoryController, PutawayController],
    providers: [InventoryService, PutawayService, RotationRuleResolverService, PackagingService, PrismaService, StockMoveService, UtilisationService],
    exports: [InventoryService, PutawayService, RotationRuleResolverService, PackagingService, StockMoveService, UtilisationService],
})
export class InventoryModule { }

