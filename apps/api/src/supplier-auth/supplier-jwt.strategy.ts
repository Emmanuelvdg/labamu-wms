import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface SupplierJwtPayload {
    sub: string;
    supplierId: string;
    role: 'SUPPLIER';
}

@Injectable()
export class SupplierJwtStrategy extends PassportStrategy(Strategy, 'jwt-supplier') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req: any) => req?.cookies?.supplier_token ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'labamu-jwt-secret-change-in-production-please',
        });
    }

    validate(payload: SupplierJwtPayload) {
        if (payload.role !== 'SUPPLIER') throw new UnauthorizedException('Not a supplier token');
        return { supplierId: payload.supplierId, supplierUserId: payload.sub, role: payload.role };
    }
}
