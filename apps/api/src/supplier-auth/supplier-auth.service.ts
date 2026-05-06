import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SupplierAuthService {
    constructor(private prisma: PrismaService, private jwtService: JwtService) { }

    async register(token: string, password: string) {
        const invitation = await this.prisma.supplierInvitation.findUnique({ where: { token } });
        if (!invitation) throw new BadRequestException('Invalid invitation token');
        if (invitation.usedAt) throw new BadRequestException('Invitation already used');
        if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

        const passwordHash = await bcrypt.hash(password, 10);
        const supplierUser = await this.prisma.supplierUser.create({
            data: { supplierId: invitation.supplierId, email: invitation.email, passwordHash },
        });

        await this.prisma.supplierInvitation.update({ where: { token }, data: { usedAt: new Date() } });

        return { id: supplierUser.id, email: supplierUser.email, supplierId: supplierUser.supplierId };
    }

    async login(email: string, password: string) {
        const user = await this.prisma.supplierUser.findUnique({ where: { email } });
        if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        await this.prisma.supplierUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        const payload = { sub: user.id, supplierId: user.supplierId, role: 'SUPPLIER' };
        return { access_token: this.jwtService.sign(payload), supplierId: user.supplierId };
    }

    async invite(email: string, supplierId: string, expiresInDays = 7) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) throw new NotFoundException('Supplier not found');

        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const invitation = await this.prisma.supplierInvitation.create({
            data: { email, supplierId, token, expiresAt },
        });
        return { id: invitation.id, email, supplierId, token, expiresAt };
    }

    async getMe(userId: string) {
        const user = await this.prisma.supplierUser.findUnique({
            where: { id: userId },
            include: { supplier: true },
        });
        if (!user) throw new NotFoundException('Supplier user not found');
        return { id: user.id, email: user.email, supplierId: user.supplierId, supplier: user.supplier };
    }
}
