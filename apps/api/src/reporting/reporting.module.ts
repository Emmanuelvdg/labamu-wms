import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { DrillDownService } from './drilldown.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ReportingController } from './reporting.controller';
import { PrismaService } from '../prisma.service';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';

@Module({
    imports: [CompanyModule],
    controllers: [ReportingController],
    providers: [ReportingService, DrillDownService, InventoryLedgerService, PrismaService, FeatureFlagGuard],
})
export class ReportingModule { }
