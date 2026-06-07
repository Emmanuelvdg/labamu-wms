import { Module, Global } from '@nestjs/common';
import { OperationalAuditService } from './operational-audit.service';
import { OperationalAuditController } from './operational-audit.controller';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
    controllers: [OperationalAuditController],
    providers: [OperationalAuditService, PrismaService],
    exports: [OperationalAuditService],
})
export class OperationalAuditModule {}
