import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationConfigService } from './notification-config.service';
import { NotificationConfigController } from './notification-config.controller';
import { ExpiryCheckerService } from './expiry-checker.service';
import {  } from '../prisma.service';
import { EmailModule } from '../common/email/email.module';

@Module({
    imports: [EmailModule],
    controllers: [NotificationController, NotificationConfigController],
    providers: [NotificationService, NotificationConfigService, ExpiryCheckerService],
    exports: [NotificationService, NotificationConfigService, ExpiryCheckerService],
})
export class NotificationModule { }
