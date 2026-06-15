import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';
import { WaveReleaseRuleService } from './wave-release-rule.service';
import { StrategyController } from './strategy.controller';
import { PickingStrategiesController } from './picking-strategies.controller';
import {  } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';
import { TaskOptimisationService } from '../workflow/task-optimisation.service';

@Module({
    imports: [InventoryModule, CompanyModule],
    controllers: [StrategyController, PickingStrategiesController],
    providers: [StrategyService, PickingStrategyService, WaveReleaseRuleService, FeatureFlagGuard, TaskOptimisationService],
    exports: [StrategyService, PickingStrategyService],
})
export class StrategyModule { }
