import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Hashing password...');
    const hash = await bcrypt.hash('admin', 10);
    await prisma.user.update({
        where: { email: 'admin@labamu.co.id' },
        data: { password: hash }
    });
    console.log('Password updated successfully to "admin".');
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
