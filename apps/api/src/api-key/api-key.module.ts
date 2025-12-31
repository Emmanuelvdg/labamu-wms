import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ApiKeyController],
    providers: [ApiKeyService, ApiKeyGuard, PrismaService],
    exports: [ApiKeyService, ApiKeyGuard]
})
export class ApiKeyModule { }
