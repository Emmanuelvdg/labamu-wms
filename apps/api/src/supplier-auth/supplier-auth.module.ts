import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierAuthController } from './supplier-auth.controller';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';
import { SupplierAuthGuard } from './supplier-auth.guard';
import {  } from '../prisma.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: '7d' },
            }),
        }),
        NotificationModule,
    ],
    controllers: [SupplierAuthController, SupplierPortalController],
    providers: [SupplierAuthService, SupplierJwtStrategy, SupplierAuthGuard],
    exports: [SupplierAuthGuard, SupplierJwtStrategy],
})
export class SupplierAuthModule { }
