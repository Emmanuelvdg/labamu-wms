import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { PlatformController } from './platform.controller';
import { CompanyService } from './company.service';
import { PlanService } from './plan.service';
import { FeatureFlagService } from './feature-flag.service';
import { AuditService } from './audit.service';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Module({
    controllers: [CompanyController, PlatformController],
    providers: [
        CompanyService,
        PlanService,
        FeatureFlagService,
        AuditService,
        PlatformService,
        PrismaService,
        PermissionsGuard,
    ],
    exports: [CompanyService, AuditService, FeatureFlagService],
})
export class CompanyModule {}
