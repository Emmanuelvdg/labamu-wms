import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function fixPasswords() {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany();

    let updated = 0;
    for (const user of users) {
        if (user.password && !user.password.startsWith('$2b$')) {
            console.log(`Fixing password for ${user.email} (current: ${user.password})`);
            const hash = await bcrypt.hash(user.password === 'password123' ? 'admin123' : user.password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hash }
            });
            updated++;
        }
    }

    console.log(`Fixed ${updated} user passwords.`);
    await prisma.$disconnect();
}

fixPasswords().catch(console.error);
