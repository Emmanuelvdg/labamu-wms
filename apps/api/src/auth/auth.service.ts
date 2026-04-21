import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { JwtPayload } from './jwt.strategy';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
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

        if (user.password) {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            companyId: user.companyId ?? null,
            companySlug: user.company?.slug ?? null,
        };

        const token = this.jwtService.sign(payload);

        // Return both the token and the user profile so the frontend can store both
        const { password: _pw, ...safeUser } = user as any;
        return { token, user: safeUser };
    }

    /** Verify a JWT and return its payload — used by the x-user-id fallback path */
    verifyToken(token: string): JwtPayload {
        return this.jwtService.verify<JwtPayload>(token);
    }
}
