import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { PrismaService } from './prisma.service';

async function bootstrap() {
    try {
        console.log('Bootstrap starting...');
        const app = await NestFactory.create(AppModule);
        app.enableCors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
        });
        app.use((req, res, next) => {
            console.log(`[REQUEST] ${req.method} ${req.url}`);
            next();
        });



        const port = process.env.PORT || 3001;
        console.log(`Attempting to listen on port ${port}...`);
        await app.listen(port, '0.0.0.0');
        console.log(`Application is running on: ${await app.getUrl()}`);
        console.log('--- SERVER STARTED WITH RESERVATION LOGIC ---');
    } catch (err) {
        console.error('Bootstrap Error:', err);
    }
}
bootstrap();
