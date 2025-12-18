
import { Controller, Post, Body, HttpCode, HttpStatus, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private prisma: PrismaService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: { email: string }) {
        return this.authService.login(body.email);
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
