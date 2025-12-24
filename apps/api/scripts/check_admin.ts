
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    console.log('Upserting admin@labamu.co.id...');

    try {
        const user = await prisma.user.upsert({
            where: { email: 'admin@labamu.co.id' },
            update: {},
            create: {
                email: 'admin@labamu.co.id',
                name: 'Admin User',
                // Password is not used by AuthService currently, but schema might require it
                password: 'admin',
            },
        });
        console.log('Success! User ID:', user.id);
    } catch (e) {
        console.error('Error creating admin:', e);
    }

    await app.close();
}
bootstrap();
