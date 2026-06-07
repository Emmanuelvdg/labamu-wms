import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private from: string;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        this.from = process.env.SMTP_FROM || `Labamu IMS <noreply@labamu.app>`;

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log(`Email configured via ${host}:${port}`);
        } else {
            this.logger.warn('SMTP not configured — email dispatch disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable.');
        }
    }

    async send(to: string | string[], subject: string, html: string): Promise<void> {
        if (!this.transporter) return;

        const recipients = Array.isArray(to) ? to.join(', ') : to;
        try {
            await this.transporter.sendMail({ from: this.from, to: recipients, subject, html });
            this.logger.log(`Email sent: "${subject}" → ${recipients}`);
        } catch (err: any) {
            this.logger.error(`Email failed: "${subject}" → ${recipients}: ${err?.message ?? err}`);
        }
    }

    isConfigured(): boolean {
        return this.transporter !== null;
    }
}
