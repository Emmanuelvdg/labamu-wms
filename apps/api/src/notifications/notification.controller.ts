import { Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ExpiryCheckerService } from './expiry-checker.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('notifications')
@UseGuards(PermissionsGuard)
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly expiryCheckerService: ExpiryCheckerService,
    ) { }

    @Get()
    async getNotifications(
        @Query('read') read?: string,
        @Query('limit') limit?: string,
    ) {
        return this.notificationService.getNotifications({
            read: read !== undefined ? read === 'true' : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get('unread-count')
    async getUnreadCount() {
        return { count: await this.notificationService.getUnreadCount() };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    @Post('mark-all-read')
    async markAllAsRead() {
        return this.notificationService.markAllAsRead();
    }

    @Post('check-expiry')
    async checkExpiry(@Query('days') days?: string) {
        return this.expiryCheckerService.checkExpiringBatches(days ? parseInt(days) : 30);
    }

    @Post('check-expired')
    async checkExpired() {
        return this.expiryCheckerService.checkExpiredBatches();
    }
}
