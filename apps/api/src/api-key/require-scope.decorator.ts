import { SetMetadata } from '@nestjs/common';

export const SCOPE_KEY = 'required_scope';

/**
 * Declare the API-key scope required to call an endpoint.
 * When a request arrives authenticated via an API key, the guard checks that
 * the key's scope list contains this value.
 * Requests authenticated via session JWT bypass this check entirely.
 *
 * Usage: @RequireScope('INVENTORY:READ')
 */
export const RequireScope = (scope: string) => SetMetadata(SCOPE_KEY, scope);
