import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';
import { WaveReleaseRuleService } from './wave-release-rule.service';
import { StrategyController } from './strategy.controller';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';

@Module({
    imports: [InventoryModule, CompanyModule],
    controllers: [StrategyController],
    providers: [StrategyService, PickingStrategyService, WaveReleaseRuleService, PrismaService, FeatureFlagGuard],
    exports: [StrategyService, PickingStrategyService],
})
export class StrategyModule { }
