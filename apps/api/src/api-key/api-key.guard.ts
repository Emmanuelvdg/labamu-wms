import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';
import { SCOPE_KEY } from './require-scope.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly rateLimiter: ApiKeyRateLimiterService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            // No API key — let session-based auth handle it.
            return true;
        }

        let validation: Awaited<ReturnType<ApiKeyService['validateApiKey']>>;
        try {
            validation = await this.apiKeyService.validateApiKey(apiKey);
        } catch {
            throw new UnauthorizedException('Invalid or expired API key');
        }

        // Enforce per-key rate limit.
        this.rateLimiter.check(validation.keyId);

        // Attach user context so downstream controllers and PermissionsGuard work normally.
        request.user = {
            id: validation.userId,
            scopes: validation.scopes,
            authMethod: 'api-key',
        };

        // Scope check — only applies when the request used an API key.
        const requiredScope = this.reflector.getAllAndOverride<string>(SCOPE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (requiredScope && !validation.scopes.includes(requiredScope)) {
            throw new ForbiddenException(
                `API key is missing required scope: ${requiredScope}`,
            );
        }

        return true;
    }
}
