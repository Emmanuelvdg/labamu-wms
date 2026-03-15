import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
    const prisma = new PrismaClient();
    const email = 'admin@labamu.co.id';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log(`User ${email} not found.`);
        return;
    }

    console.log(`User found: ${user.id}, name: ${user.name}`);
    console.log(`Stored password hash: ${user.password}`);

    const isMatch = await bcrypt.compare('admin123', user.password || '');
    console.log(`Password match with 'admin123': ${isMatch}`);

    await prisma.$disconnect();
}

main().catch(console.error);
