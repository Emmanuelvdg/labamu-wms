import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private prisma: PrismaService) { }

    async createNotification(data: {
        type: string;
        title: string;
        body: string;
        link?: string;
        metadata?: any;
        userId?: string;
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

    async markAsRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
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
