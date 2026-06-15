import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { DrillDownService } from './drilldown.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ReportingController } from './reporting.controller';
import {  } from '../prisma.service';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';
import { CurrencyModule } from '../currency/currency.module';

@Module({
    imports: [CompanyModule, CurrencyModule],
    controllers: [ReportingController],
    providers: [ReportingService, DrillDownService, InventoryLedgerService, FeatureFlagGuard],
})
export class ReportingModule { }
