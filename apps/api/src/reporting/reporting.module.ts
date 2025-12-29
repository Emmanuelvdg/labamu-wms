import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { DrillDownService } from './drilldown.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ReportingController } from './reporting.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ReportingController],
    providers: [ReportingService, DrillDownService, InventoryLedgerService, PrismaService],
})
export class ReportingModule { }
