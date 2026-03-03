import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { PrismaService } from './prisma.service';
import { ErrorCatalogService } from './common/errors/error-catalog.service';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

// Load .env file from apps/api directory
const envPath = path.join(process.cwd(), '.env');
console.log('[ENV] Loading .env from:', envPath);
dotenv.config({ path: envPath });
console.log('[ENV] LALAMOVE_API_KEY loaded:', !!process.env.LALAMOVE_API_KEY);
console.log('[ENV] LALAMOVE_API_SECRET loaded:', !!process.env.LALAMOVE_API_SECRET);

async function bootstrap() {
    try {
        console.log('Bootstrap starting...');
        const app = await NestFactory.create(AppModule);

        // Security middleware
        app.use(helmet());

        // CORS config
        const corsOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://127.0.0.1:3000'];

        app.enableCors({
            origin: corsOrigins,
            credentials: true,
        });
        if (process.env.NODE_ENV !== 'production') {
            app.use((req: any, res: any, next: any) => {
                Logger.debug(`[REQUEST] ${req.method} ${req.url}`, 'HTTP');
                next();
            });
        }

        // Register global error catalog filter
        const errorCatalog = new ErrorCatalogService();
        app.useGlobalFilters(new AppExceptionFilter(errorCatalog));

        // Global Input Validation
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,       // Strip unknown properties
            forbidNonWhitelisted: true,  // Reject unknown properties
            transform: true,       // Auto-transform payloads to DTO instances
        }));



        const port = process.env.PORT || 3001;
        Logger.log(`Attempting to listen on port ${port}...`, 'Bootstrap');
        await app.listen(port, '0.0.0.0');
        Logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
        Logger.log('--- SERVER STARTED WITH RESERVATION LOGIC ---', 'Bootstrap');
    } catch (err) {
        console.error('Bootstrap Error:', err);
    }
}
bootstrap();
