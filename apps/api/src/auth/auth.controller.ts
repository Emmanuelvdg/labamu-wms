import {
    Controller, Post, Body, HttpCode, HttpStatus,
    Get, Headers, UnauthorizedException,
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
        return user;
    }
}
