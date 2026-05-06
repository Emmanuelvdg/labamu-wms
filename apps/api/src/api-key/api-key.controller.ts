import {
    Controller, Post, Get, Delete,
    Body, Param, Headers, HttpException, HttpStatus, ForbiddenException, BadRequestException, ConflictException,
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
        if (!dto.name) throw new BadRequestException('name is required');
        if (!Array.isArray(dto.scopes) || dto.scopes.length === 0) throw new BadRequestException('scopes[] is required');

        const companyId = getCurrentCompanyId();
        if (companyId) {
            const flags = await this.featureFlags.getFlagsForCompany(companyId);
            const apiAccess = flags.find(f => f.key === 'API_ACCESS');
            if (!apiAccess?.enabled) {
                throw new ForbiddenException('API access is not enabled for your account. Contact your platform administrator.');
            }
        }

        try {
            const result = await this.apiKeyService.createApiKey(userId, dto);
            return {
                message: 'API key created successfully. Store this key securely — it will not be shown again.',
                key: result.key,
                apiKey: result.apiKey,
            };
        } catch (err: any) {
            if (err?.code === 'P2002') throw new ConflictException('API key with this name already exists');
            if (err?.code === 'P2003') throw new BadRequestException('Invalid user ID');
            throw err;
        }
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
