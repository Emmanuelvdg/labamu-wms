import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';
import {  } from '../prisma.service';
import { CompanyModule } from '../company/company.module';

@Module({
    imports: [CompanyModule],
    controllers: [ApiKeyController],
    providers: [ApiKeyService, ApiKeyGuard, ApiKeyRateLimiterService],
    exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
