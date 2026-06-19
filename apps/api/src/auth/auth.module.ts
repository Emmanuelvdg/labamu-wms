import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../common/email/email.module';

const INSECURE_DEFAULT = 'labamu-jwt-secret-change-in-production-please';

function resolveJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === INSECURE_DEFAULT) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET env var is not set or uses the insecure default. Set a strong random secret before deploying.');
        }
        return INSECURE_DEFAULT;
    }
    return secret;
}

@Global()
@Module({
    imports: [
        EmailModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: resolveJwtSecret(),
                signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
