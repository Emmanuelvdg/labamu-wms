import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface WindowEntry {
    count: number;
    windowStart: number;
}

const WINDOW_MS = 60_000;
const LIMIT = 60;

/**
 * In-memory sliding-window rate limiter scoped per API key ID.
 * Each key is limited to LIMIT requests per WINDOW_MS.
 * State is per-process and resets on restart — acceptable for a first pass.
 */
@Injectable()
export class ApiKeyRateLimiterService {
    private readonly windows = new Map<string, WindowEntry>();

    check(keyId: string): void {
        const now = Date.now();
        const entry = this.windows.get(keyId);

        if (!entry || now - entry.windowStart >= WINDOW_MS) {
            this.windows.set(keyId, { count: 1, windowStart: now });
            return;
        }

        entry.count += 1;

        if (entry.count > LIMIT) {
            const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
            throw new HttpException(
                { message: 'API key rate limit exceeded', retryAfterSeconds: retryAfter },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }
}
