import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

export interface CreateApiKeyDto {
    name: string;
    description?: string;
    scopes: string[];
    expiresAt?: Date;
}

export interface ApiKeyValidationResult {
    userId: string;
    scopes: string[];
}

@Injectable()
export class ApiKeyService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate a new API key for a user
     */
    async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<{ key: string; apiKey: any }> {
        // Generate a random API key (32 bytes = 64 hex chars)
        const rawKey = crypto.randomBytes(32).toString('hex');

        // Hash the key for storage (SHA-256)
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const apiKey = await this.prisma.apiKey.create({
            data: {
                name: dto.name,
                description: dto.description,
                keyHash,
                scopes: JSON.stringify(dto.scopes),
                userId,
                expiresAt: dto.expiresAt,
            },
            include: {
                user: {
                    select: { id: true, email: true, name: true }
                }
            }
        });

        // Return both: the raw key (to show user ONCE) and the DB record (without showing hash)
        return {
            key: rawKey,
            apiKey: {
                ...apiKey,
                keyHash: undefined, // Don't expose hash
                scopes: JSON.parse(apiKey.scopes)
            }
        };
    }

    /**
     * Validate an API key and return user context
     */
    async validateApiKey(rawKey: string): Promise<ApiKeyValidationResult> {
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const apiKey = await this.prisma.apiKey.findUnique({
            where: { keyHash },
            include: { user: true }
        });

        if (!apiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        if (!apiKey.isActive) {
            throw new ForbiddenException('API key is inactive');
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            throw new ForbiddenException('API key has expired');
        }

        // Update last used timestamp
        await this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() }
        });

        return {
            userId: apiKey.userId,
            scopes: JSON.parse(apiKey.scopes)
        };
    }

    /**
     * List all API keys for a user
     */
    async listApiKeys(userId: string) {
        const keys = await this.prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                scopes: true,
                lastUsedAt: true,
                expiresAt: true,
                isActive: true,
                createdAt: true,
            }
        });

        return keys.map(key => ({
            ...key,
            scopes: JSON.parse(key.scopes)
        }));
    }

    /**
     * Revoke (deactivate) an API key
     */
    async revokeApiKey(keyId: string, userId: string) {
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id: keyId }
        });

        if (!apiKey || apiKey.userId !== userId) {
            throw new ForbiddenException('Cannot revoke this API key');
        }

        return this.prisma.apiKey.update({
            where: { id: keyId },
            data: { isActive: false }
        });
    }

    /**
     * Delete an API key permanently
     */
    async deleteApiKey(keyId: string, userId: string) {
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id: keyId }
        });

        if (!apiKey || apiKey.userId !== userId) {
            throw new ForbiddenException('Cannot delete this API key');
        }

        return this.prisma.apiKey.delete({
            where: { id: keyId }
        });
    }
}
