import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

export interface JwtPayload {
    sub: string;        // userId
    email: string;
    companyId: string | null;
    companySlug: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private prisma: PrismaService) {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not set. Set it before starting the API.');
        }
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // 1. Bearer token in Authorization header
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                // 2. Cookie (Next.js sets 'token' cookie on login)
                (req: any) => req?.cookies?.token ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { roles: { include: { permissions: true } }, warehouses: true },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const { password: _pw, ...safeUser } = user as any;
        return { ...safeUser, companyId: payload.companyId, companySlug: payload.companySlug };
    }
}
