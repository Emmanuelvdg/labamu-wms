import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private apiKeyService: ApiKeyService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            // If no API key, let other guards handle it (e.g., session-based auth)
            return true;
        }

        try {
            const validation = await this.apiKeyService.validateApiKey(apiKey);

            // Attach user context to request
            request.user = {
                id: validation.userId,
                scopes: validation.scopes,
                authMethod: 'api-key'
            };

            // Set x-user-id for downstream controllers
            request.headers['x-user-id'] = validation.userId;

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired API key');
        }
    }
}
