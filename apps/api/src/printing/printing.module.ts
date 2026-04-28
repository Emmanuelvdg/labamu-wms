import { Module } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { PrintingController } from './printing.controller';
import { PrinterConfigService } from './printer-config.service';
import { PrinterConfigController } from './printer-config.controller';
import { PrismaService } from '../prisma.service';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';

@Module({
    imports: [CompanyModule],
    controllers: [PrintingController, PrinterConfigController],
    providers: [PrintingService, PrinterConfigService, PrismaService, FeatureFlagGuard],
    exports: [PrintingService],
})
export class PrintingModule {}
