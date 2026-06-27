import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../common/email/email.service';
import { NotificationConfigService } from './notification-config.service';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private prisma: PrismaService,
        private email: EmailService,
        private notificationConfig: NotificationConfigService,
    ) { }

    async createNotification(data: {
        type: string;
        title: string;
        body: string;
        link?: string;
        metadata?: any;
        userId?: string;
        /** Pass companyId to enable per-tenant email dispatch based on that tenant's notification config. */
        companyId?: string;
    }) {
        const notification = await this.prisma.notification.create({
            data: {
                type: data.type,
                title: data.title,
                body: data.body,
                link: data.link,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                userId: data.userId,
            },
        });
        this.logger.log(`Notification created: [${data.type}] ${data.title}`);

        if (data.companyId && this.email.isConfigured()) {
            try {
                const recipients = await this.notificationConfig.resolveRecipients(data.companyId, data.type);
                if (recipients && recipients.length > 0) {
                    const html = buildEmailHtml(data.title, data.body, data.link);
                    await this.email.send(recipients, data.title, html);
                }
            } catch (e: any) {
                this.logger.warn(`Email dispatch failed for [${data.type}]: ${e?.message ?? e}`);
            }
        }

        return notification;
    }

    async getNotifications(filters?: { userId?: string; read?: boolean; limit?: number }) {
        const where: any = {};
        if (filters?.userId) where.userId = filters.userId;
        if (filters?.read !== undefined) where.read = filters.read;

        return this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 50,
        });
    }

    async getUnreadCount(userId?: string) {
        const where: any = { read: false };
        if (userId) where.userId = userId;
        return this.prisma.notification.count({ where });
    }

    async markAsRead(id: string, userId?: string) {
        return this.prisma.notification.update({
            where: userId ? { id, userId } : { id },
            data: { read: true },
        });
    }

    async markAllAsRead(userId?: string) {
        const where: any = { read: false };
        if (userId) where.userId = userId;
        return this.prisma.notification.updateMany({
            where,
            data: { read: true },
        });
    }
}

function buildEmailHtml(title: string, body: string, link?: string): string {
    const actionButton = link
        ? `<p style="margin-top:24px"><a href="${link}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View in Labamu IMS</a></p>`
        : '';
    return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f3f4f6;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 8px;color:#111827">${title}</h2>
    <p style="color:#374151;line-height:1.6">${body}</p>
    ${actionButton}
    <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb">
    <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">Labamu IMS — automated notification</p>
  </div>
</body>
</html>`;
}
