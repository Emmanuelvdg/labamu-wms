import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export const ALL_NOTIFICATION_TYPES = [
    'LOW_STOCK',
    'CRITICAL_STOCK',
    'PO_APPROVAL_REQUIRED',
    'ORDER_SHIPPED',
    'EXPIRY_WARNING',
    'EXPIRED_STOCK',
    'WORKFLOW_TASK_SLA_BREACH',
    'SUPPLIER_INVOICE_UPLOADED',
] as const;

export type NotificationType = typeof ALL_NOTIFICATION_TYPES[number];

@Injectable()
export class NotificationConfigService {
    constructor(private prisma: PrismaService) {}

    async getConfigs(companyId: string) {
        const saved = await this.prisma.companyNotificationConfig.findMany({
            where: { companyId },
        });

        // Return all known types, merging saved config with defaults
        return ALL_NOTIFICATION_TYPES.map((type) => {
            const config = saved.find((c) => c.notificationType === type);
            return {
                notificationType: type,
                emailEnabled: config?.emailEnabled ?? true,
                recipients: config?.recipients ? JSON.parse(config.recipients) : null,
            };
        });
    }

    async upsertConfig(
        companyId: string,
        notificationType: string,
        dto: { emailEnabled: boolean; recipients?: string[] | null },
    ) {
        // Validate company exists
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new NotFoundException(`Company ${companyId} not found`);

        return this.prisma.companyNotificationConfig.upsert({
            where: { companyId_notificationType: { companyId, notificationType } },
            update: {
                emailEnabled: dto.emailEnabled,
                recipients: dto.recipients != null ? JSON.stringify(dto.recipients) : null,
            },
            create: {
                companyId,
                notificationType,
                emailEnabled: dto.emailEnabled,
                recipients: dto.recipients != null ? JSON.stringify(dto.recipients) : null,
            },
        });
    }

    /**
     * Resolve the email recipient list for a notification type and company.
     * Returns null if email is disabled for this type.
     * Returns [] if all company users should be notified (no specific override).
     */
    async resolveRecipients(companyId: string, notificationType: string): Promise<string[] | null> {
        const config = await this.prisma.companyNotificationConfig.findUnique({
            where: { companyId_notificationType: { companyId, notificationType } },
        });

        // Default: email enabled, recipients = all company users
        const emailEnabled = config?.emailEnabled ?? true;
        if (!emailEnabled) return null;

        if (config?.recipients) {
            const parsed: string[] = JSON.parse(config.recipients);
            if (parsed.length > 0) return parsed;
        }

        // Fallback: all company users
        const users = await this.prisma.user.findMany({
            where: { companyId },
            select: { email: true },
        });
        return users.map((u) => u.email);
    }
}
