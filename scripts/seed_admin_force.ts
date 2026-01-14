
// @ts-nocheck
const { PrismaClient } = require('@labamu/database');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Seeding Admin User ===');

    const email = 'admin@labamu.co.id';

    // 1. Upsert User
    console.log('Upserting user...');
    const user = await prisma.user.upsert({
        where: { email },
        update: {}, // No update needed if exists, just ensure it's there
        create: {
            email,
            name: 'Admin User',
            password: 'hashed_password_placeholder', // Service ignores this anyway
            roles: {
                create: {
                    name: 'Admin',
                    description: 'Full Access',
                    permissions: {
                        create: [
                            { resource: '*', action: '*' } // Super admin permission
                        ]
                    }
                }
            }
        }
    });
    console.log(`✅ User ensured: ${user.email} (ID: ${user.id})`);

    // 2. Ensure Admin Role is assigned if user existed but had no role
    const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: { roles: true }
    });

    if (userWithRoles.roles.length === 0) {
        console.log('User has no roles. Assigning Admin role...');
        // Find or create admin role
        let adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'Admin',
                    description: 'Full Access',
                    permissions: { create: [{ resource: '*', action: '*' }] }
                }
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                roles: {
                    connect: { id: adminRole.id }
                }
            }
        });
        console.log('✅ Assigned Admin role');
    } else {
        console.log('User already has roles.');
    }

    console.log('=== Seed Complete ===');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
