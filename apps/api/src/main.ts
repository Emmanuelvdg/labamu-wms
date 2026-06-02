import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { PrismaService } from './prisma.service';
import { ErrorCatalogService } from './common/errors/error-catalog.service';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const logger = new Logger('Bootstrap');

function validateEnv() {
    const isProd = process.env.NODE_ENV === 'production';
    const missing: string[] = [];

    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

    if (isProd) {
        if (!process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS');
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'labamu-jwt-secret-change-in-production-please') {
            throw new Error('JWT_SECRET must be set to a strong unique value in production.');
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

async function bootstrap() {
    validateEnv();

    const app = await NestFactory.create(AppModule);

    app.use(helmet());

    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    });

    const errorCatalog = new ErrorCatalogService();
    app.useGlobalFilters(new AppExceptionFilter(errorCatalog));

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    logger.log(`Application running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}

bootstrap().catch(err => {
    new Logger('Bootstrap').error(`Fatal startup error: ${err.message}`, err.stack);
    process.exit(1);
});
