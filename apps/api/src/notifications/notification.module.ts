import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { ExpiryCheckerService } from './expiry-checker.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../common/email/email.module';

@Module({
    imports: [EmailModule],
    controllers: [NotificationController],
    providers: [NotificationService, ExpiryCheckerService, PrismaService],
    exports: [NotificationService, ExpiryCheckerService],
})
export class NotificationModule { }
