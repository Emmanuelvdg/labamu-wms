import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function fixPasswords() {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany();

    let updated = 0;
    for (const user of users) {
        // Change all users back to 'password123'
        const hash = await bcrypt.hash('password123', 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hash }
        });
        updated++;
    }

    console.log(`Reset ${updated} user passwords back to 'password123'.`);
    await prisma.$disconnect();
}

fixPasswords().catch(console.error);
