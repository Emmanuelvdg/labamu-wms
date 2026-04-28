import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../../company/feature-flag.service';
import { getCurrentCompanyId } from '../tenant/tenant-storage';

export const FLAG_KEY = 'required_feature_flag';

export const RequireFlag = (flagKey: string) => SetMetadata(FLAG_KEY, flagKey);

/**
 * Guards an endpoint behind a company feature flag.
 * Decorate with @RequireFlag('BARCODE_PRINT') and apply @UseGuards(FeatureFlagGuard).
 * Platform admin requests (no companyId in context) always pass through.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly featureFlags: FeatureFlagService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const flagKey = this.reflector.getAllAndOverride<string>(FLAG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!flagKey) return true;

        const companyId = getCurrentCompanyId();
        if (!companyId) return true; // platform admin — no tenant context

        const flags = await this.featureFlags.getFlagsForCompany(companyId);
        const flag = flags.find(f => f.key === flagKey);

        if (!flag?.enabled) {
            throw new ForbiddenException(
                `The "${flagKey.replace(/_/g, ' ').toLowerCase()}" feature is not enabled for your account.`,
            );
        }

        return true;
    }
}
