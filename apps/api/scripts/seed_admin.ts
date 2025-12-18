
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Admin User...');

    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!adminRole) {
        throw new Error('Admin role not found. Run migrate_rbac.ts first.');
    }

    const email = 'admin@labamu.co.id';

    // Check if user exists by email
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        console.log('Admin user already exists. Updating role...');
        await prisma.user.update({
            where: { email },
            data: { roles: { connect: { id: adminRole.id } } }
        });
    } else {
        console.log('Creating Admin user...');
        // Check if there's a user named "Emmanuel" or similar to convert, otherwise create new
        const oldAdmin = await prisma.user.findFirst({ where: { name: 'Emmanuel' } });

        if (oldAdmin) {
            console.log('Found old admin user "Emmanuel". Updating email and role...');
            await prisma.user.update({
                where: { id: oldAdmin.id },
                data: { email, roles: { connect: { id: adminRole.id } } }
            });
        } else {
            await prisma.user.create({
                data: {
                    name: 'Admin',
                    email,
                    password: 'admin', // Plain text for now as AuthService ignores it
                    roles: { connect: { id: adminRole.id } }
                }
            });
        }
    }

    console.log('Admin User Seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
