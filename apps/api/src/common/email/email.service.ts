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

    // ── Transactional email helpers ───────────────────────────────────────────

    async sendWelcome(to: string, name: string): Promise<void> {
        const appUrl = process.env.APP_URL ?? 'https://app.labamu.id';
        await this.send(to, 'Welcome to Labamu IMS 🎉', `
            <h2>Hi ${name}, welcome aboard!</h2>
            <p>Your Labamu IMS account is ready. Log in to start managing your warehouse operations.</p>
            <p><a href="${appUrl}/login" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Open Labamu IMS</a></p>
            <p style="color:#6b7280;font-size:13px;">If you didn't expect this email, you can safely ignore it.</p>
        `);
    }

    async sendPasswordReset(to: string, name: string, resetLink: string): Promise<void> {
        await this.send(to, 'Reset your Labamu IMS password', `
            <h2>Hi ${name},</h2>
            <p>We received a request to reset your password. Click the button below — the link expires in <strong>1 hour</strong>.</p>
            <p><a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
            <p style="color:#6b7280;font-size:13px;">If you didn't request this, no action is needed — your password has not changed.</p>
        `);
    }

    async sendEmailVerification(to: string, name: string, verifyLink: string): Promise<void> {
        await this.send(to, 'Verify your Labamu IMS email', `
            <h2>Hi ${name},</h2>
            <p>Please verify your email address to activate your account.</p>
            <p><a href="${verifyLink}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
            <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours.</p>
        `);
    }

    async sendOrderConfirmation(to: string, orderRef: string, items: Array<{ name: string; quantity: number }>, totalItems: number): Promise<void> {
        const rows = items.map(i => `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px;text-align:right">${i.quantity}</td></tr>`).join('');
        await this.send(to, `Order ${orderRef} confirmed`, `
            <h2>Order ${orderRef} has been confirmed</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px">
                <thead><tr style="background:#f3f4f6"><th style="padding:6px 12px;text-align:left">Product</th><th style="padding:6px 12px;text-align:right">Qty</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:13px;margin-top:16px">Total items: ${totalItems} — You will receive another notification when your order ships.</p>
        `);
    }

    async sendShipmentNotification(to: string, orderRef: string, trackingNumber: string, carrier?: string): Promise<void> {
        await this.send(to, `Order ${orderRef} has shipped`, `
            <h2>Your order ${orderRef} is on its way!</h2>
            ${carrier ? `<p>Carrier: <strong>${carrier}</strong></p>` : ''}
            <p>Tracking number: <strong>${trackingNumber}</strong></p>
            <p style="color:#6b7280;font-size:13px;">Use your carrier's website to track the shipment status.</p>
        `);
    }

    async sendLowStockAlert(to: string | string[], productName: string, sku: string, currentQty: number, reorderPoint: number): Promise<void> {
        await this.send(to, `⚠️ Low stock alert: ${productName}`, `
            <h2>Low stock alert</h2>
            <p>Product <strong>${productName}</strong> (SKU: ${sku}) has fallen below its reorder point.</p>
            <ul>
                <li>Current quantity: <strong>${currentQty}</strong></li>
                <li>Reorder point: <strong>${reorderPoint}</strong></li>
            </ul>
            <p>Consider placing a purchase order to replenish stock.</p>
        `);
    }
}
