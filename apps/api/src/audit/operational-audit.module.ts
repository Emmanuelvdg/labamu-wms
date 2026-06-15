import { Module, Global } from '@nestjs/common';
import { OperationalAuditService } from './operational-audit.service';
import { OperationalAuditController } from './operational-audit.controller';
import {  } from '../prisma.service';

@Global()
@Module({
    controllers: [OperationalAuditController],
    providers: [OperationalAuditService],
    exports: [OperationalAuditService],
})
export class OperationalAuditModule {}
