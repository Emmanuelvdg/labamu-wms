
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async login(email: string) {
        // For MVP, we are skipping password hash check and just trusting the email
        // In production, this MUST verify password hash
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { permissions: true } } }
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }
}
