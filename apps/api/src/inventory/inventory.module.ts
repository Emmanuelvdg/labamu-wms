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
import { ReplenishmentService } from './replenishment.service';
import { ReplenishmentController } from './replenishment.controller';
import { AbcClassificationService } from './abc-classification.service';
import { AbcClassificationController } from './abc-classification.controller';
import { PickAccuracyService } from './pick-accuracy.service';
import { ReportingController } from './reporting.controller';
import { CycleCountService } from './cycle-count.service';

@Module({
    controllers: [
        InventoryController,
        PutawayController,
        ReplenishmentController,
        AbcClassificationController,
        ReportingController
    ],
    providers: [
        InventoryService,
        PutawayService,
        RotationRuleResolverService,
        PackagingService,
        PrismaService,
        StockMoveService,
        UtilisationService,
        ReplenishmentService,
        AbcClassificationService,
        PickAccuracyService,
        CycleCountService
    ],
    exports: [
        InventoryService,
        PutawayService,
        RotationRuleResolverService,
        PackagingService,
        StockMoveService,
        UtilisationService,
        ReplenishmentService,
        AbcClassificationService,
        PickAccuracyService,
        CycleCountService
    ]
})
export class InventoryModule { }
