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
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // 1. Bearer token in Authorization header
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                // 2. Cookie (Next.js sets 'token' cookie on login)
                (req: any) => req?.cookies?.token ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'labamu-jwt-secret-change-in-production-please',
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
        return { ...user, companyId: payload.companyId, companySlug: payload.companySlug };
    }
}
