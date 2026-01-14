
// @ts-nocheck
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for Admin User...');
    const user = await prisma.user.findFirst({
        where: {
            email: 'admin@labamu.co.id'
        },
        include: {
            roles: true
        }
    });

    if (user) {
        console.log(`✅ User found: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Password Hash: ${user.password.substring(0, 10)}...`);
        console.log(`   Roles: ${user.roles.map(r => r.name).join(', ')}`);

        // Count total users
        const count = await prisma.user.count();
        console.log(`\nTotal users in DB: ${count}`);
    } else {
        console.error('❌ Admin user (admin@labamu.co.id) NOT FOUND!');
        const allUsers = await prisma.user.findMany();
        console.log('Existing users:', allUsers.map(u => u.email));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
