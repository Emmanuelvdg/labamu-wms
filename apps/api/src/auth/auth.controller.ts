import {
    Controller, Post, Body, HttpCode, HttpStatus,
    Get, Headers, UnauthorizedException, Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private prisma: PrismaService) {}

    @Throttle({ default: { limit: process.env.NODE_ENV === 'production' ? 5 : 200, ttl: 60000 } })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginDto) {
        // Returns { token, user }
        return this.authService.login(body.email, body.password);
    }

    /** Self-service: request a password-reset email. Always returns 200 to avoid enumeration. */
    @Throttle({ default: { limit: process.env.NODE_ENV === 'production' ? 3 : 100, ttl: 60000 } })
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() body: { email: string }) {
        await this.authService.forgotPassword(body.email);
        return { message: 'If that email is registered, a reset link has been sent.' };
    }

    /** Self-service: set a new password using the emailed token. */
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        await this.authService.resetPassword(body.token, body.newPassword);
        return { message: 'Password updated successfully.' };
    }

    /** Verify email address using the token sent on account creation. */
    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        await this.authService.verifyEmail(token);
        return { message: 'Email verified successfully.' };
    }

    @Get('me')
    async getMe(
        @Headers('authorization') authHeader: string,
        @Headers('x-user-id') userId: string,
        @Headers('cookie') cookieHeader: string,
    ) {
        let resolvedUserId: string | undefined = userId;

        // 1. Try Bearer token
        if (!resolvedUserId && authHeader?.startsWith('Bearer ')) {
            try {
                const payload = this.authService.verifyToken(authHeader.slice(7));
                resolvedUserId = payload.sub;
            } catch {
                throw new UnauthorizedException('Invalid token');
            }
        }

        // 2. Try httpOnly `token` cookie forwarded by Next.js rewrite
        if (!resolvedUserId && cookieHeader) {
            const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
            if (match) {
                try {
                    const payload = this.authService.verifyToken(match[1]);
                    resolvedUserId = payload.sub;
                } catch {
                    // Invalid cookie token
                }
            }
        }

        if (!resolvedUserId) {
            throw new UnauthorizedException('User not identified');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: resolvedUserId },
            include: { roles: { include: { permissions: true } } },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const { password: _pw, ...safeUser } = user as any;
        return safeUser;
    }
}
