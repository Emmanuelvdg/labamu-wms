import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../common/email/email.service';
import { JwtPayload } from './jwt.strategy';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) {}

    async login(email: string, password: string) {
        const user = await (this.prisma.user.findUnique as any)({
            where: { email },
            include: {
                roles: { include: { permissions: true } },
                company: true,
            },
        }) as any;

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            companyId: user.companyId ?? null,
            companySlug: user.company?.slug ?? null,
        };

        const token = this.jwtService.sign(payload);

        // Track last login time (fire-and-forget — don't block the login response)
        (this.prisma.user.update as any)({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        }).catch(() => { /* non-critical, ignore errors */ });

        // Return both the token and the user profile so the frontend can store both
        const { password: _pw, passwordResetToken: _rt, passwordResetTokenExpiresAt: _rte, ...safeUser } = user as any;
        return { token, user: safeUser };
    }

    /** Initiate self-service password reset — generates a 1-hour token and emails a link. */
    async forgotPassword(email: string): Promise<void> {
        // Always respond OK to avoid email enumeration attacks
        const user = await (this.prisma.user.findUnique as any)({ where: { email } }) as any;
        if (!user) return;

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await (this.prisma.user.update as any)({
            where: { id: user.id },
            data: { passwordResetToken: tokenHash, passwordResetTokenExpiresAt: expiresAt },
        });

        const appUrl = process.env.APP_URL ?? 'https://app.labamu.id';
        const resetLink = `${appUrl}/reset-password?token=${token}`;
        // Fire-and-forget — don't block the response on email delivery
        this.emailService.sendPasswordReset(user.email, user.name, resetLink).catch(() => {});
    }

    /** Complete self-service password reset using the emailed token. */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await (this.prisma.user.findFirst as any)({
            where: {
                passwordResetToken: tokenHash,
                passwordResetTokenExpiresAt: { gt: new Date() },
            },
        }) as any;

        if (!user) {
            throw new BadRequestException('Invalid or expired password reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await (this.prisma.user.update as any)({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetTokenExpiresAt: null,
            },
        });
    }

    /** Send / resend email verification link. */
    async sendVerificationEmail(userId: string): Promise<void> {
        const user = await (this.prisma.user.findUnique as any)({ where: { id: userId } }) as any;
        if (!user || user.emailVerifiedAt) return;

        // Reuse the reset token slot as a verification token (expires in 24h)
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await (this.prisma.user.update as any)({
            where: { id: user.id },
            data: { passwordResetToken: tokenHash, passwordResetTokenExpiresAt: expiresAt },
        });

        const appUrl = process.env.APP_URL ?? 'https://app.labamu.id';
        const verifyLink = `${appUrl}/verify-email?token=${token}`;
        this.emailService.sendEmailVerification(user.email, user.name, verifyLink).catch(() => {});
    }

    /** Mark email as verified using the token from the verification email. */
    async verifyEmail(token: string): Promise<void> {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await (this.prisma.user.findFirst as any)({
            where: {
                passwordResetToken: tokenHash,
                passwordResetTokenExpiresAt: { gt: new Date() },
            },
        }) as any;

        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        await (this.prisma.user.update as any)({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                passwordResetToken: null,
                passwordResetTokenExpiresAt: null,
            },
        });
    }

    /** Verify a JWT and return its payload — used by the x-user-id fallback path */
    verifyToken(token: string): JwtPayload {
        return this.jwtService.verify<JwtPayload>(token);
    }
}
