import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import {  } from '../prisma.service';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';

@Module({
    imports: [CompanyModule],
    controllers: [CurrencyController],
    providers: [CurrencyService, FeatureFlagGuard],
    exports: [CurrencyService],
})
export class CurrencyModule {}
