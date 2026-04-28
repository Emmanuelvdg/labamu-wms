import {
    Controller, Post, Get, Delete,
    Body, Param, Headers, HttpException, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { ApiKeyService, CreateApiKeyDto } from './api-key.service';
import { FeatureFlagService } from '../company/feature-flag.service';
import { getCurrentCompanyId } from '../common/tenant/tenant-storage';

@Controller('api-keys')
export class ApiKeyController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly featureFlags: FeatureFlagService,
    ) {}

    @Post()
    async createApiKey(
        @Headers('x-user-id') userId: string,
        @Body() dto: CreateApiKeyDto,
    ) {
        if (!userId) throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);

        const companyId = getCurrentCompanyId();
        if (companyId) {
            const flags = await this.featureFlags.getFlagsForCompany(companyId);
            const apiAccess = flags.find(f => f.key === 'API_ACCESS');
            if (!apiAccess?.enabled) {
                throw new ForbiddenException('API access is not enabled for your account. Contact your platform administrator.');
            }
        }

        const result = await this.apiKeyService.createApiKey(userId, dto);
        return {
            message: 'API key created successfully. Store this key securely — it will not be shown again.',
            key: result.key,
            apiKey: result.apiKey,
        };
    }

    @Get()
    async listApiKeys(@Headers('x-user-id') userId: string) {
        if (!userId) throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        return this.apiKeyService.listApiKeys(userId);
    }

    @Delete(':id/revoke')
    async revokeApiKey(
        @Param('id') keyId: string,
        @Headers('x-user-id') userId: string,
    ) {
        if (!userId) throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        await this.apiKeyService.revokeApiKey(keyId, userId);
        return { message: 'API key revoked successfully' };
    }

    @Delete(':id')
    async deleteApiKey(
        @Param('id') keyId: string,
        @Headers('x-user-id') userId: string,
    ) {
        if (!userId) throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        await this.apiKeyService.deleteApiKey(keyId, userId);
        return { message: 'API key deleted successfully' };
    }
}
