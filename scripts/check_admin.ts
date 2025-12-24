
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/prisma.service';

async function checkAdmin() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    console.log('Checking for Admin User...');

    const user = await prisma.user.findUnique({
        where: { email: 'admin@labamu.co.id' }
    });

    if (user) {
        console.log('Admin User Found:', user.id, user.email, user.role);
    } else {
        console.error('Admin User NOT FOUND');
    }

    await app.close();
}

checkAdmin();
