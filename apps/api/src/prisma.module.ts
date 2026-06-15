import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global singleton Prisma module.
 *
 * By marking this @Global(), NestJS creates exactly ONE PrismaService instance
 * (and therefore ONE PrismaClient connection pool) for the entire application.
 *
 * Previously, PrismaService was declared in the `providers` array of every
 * feature module (~30 modules × connection_limit=5 = ~150 connections), which
 * routinely exhausted PostgreSQL's max_connections=100 limit.
 *
 * Feature modules no longer need to list PrismaService in their providers —
 * the global registration makes it available for injection everywhere.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
