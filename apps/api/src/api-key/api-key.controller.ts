import { Controller, Post, Get, Delete, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyService, CreateApiKeyDto } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
    constructor(private apiKeyService: ApiKeyService) { }

    /**
     * Create a new API key
     * Requires: x-user-id header (set by frontend proxy or auth middleware)
     */
    @Post()
    async createApiKey(
        @Headers('x-user-id') userId: string,
        @Body() dto: CreateApiKeyDto
    ) {
        if (!userId) {
            throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        }

        const result = await this.apiKeyService.createApiKey(userId, dto);

        return {
            message: 'API key created successfully. Store this key securely - it will not be shown again.',
            key: result.key,
            apiKey: result.apiKey
        };
    }

    /**
     * List all API keys for the current user
     */
    @Get()
    async listApiKeys(@Headers('x-user-id') userId: string) {
        if (!userId) {
            throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        }

        return this.apiKeyService.listApiKeys(userId);
    }

    /**
     * Revoke an API key
     */
    @Delete(':id/revoke')
    async revokeApiKey(
        @Param('id') keyId: string,
        @Headers('x-user-id') userId: string
    ) {
        if (!userId) {
            throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        }

        await this.apiKeyService.revokeApiKey(keyId, userId);

        return { message: 'API key revoked successfully' };
    }

    /**
     * Delete an API key permanently
     */
    @Delete(':id')
    async deleteApiKey(
        @Param('id') keyId: string,
        @Headers('x-user-id') userId: string
    ) {
        if (!userId) {
            throw new HttpException('User ID required', HttpStatus.UNAUTHORIZED);
        }

        await this.apiKeyService.deleteApiKey(keyId, userId);

        return { message: 'API key deleted successfully' };
    }
}
