
import { Controller, Post, Body, HttpCode, HttpStatus, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private prisma: PrismaService) { }

    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginDto) {
        return this.authService.login(body.email, body.password);
    }

    @Get('me')
    async getMe(@Headers('x-user-id') userId: string) {
        if (!userId) {
            throw new UnauthorizedException('User not identified');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { permissions: true } } }
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return user;
    }
}
