
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Viewer User...');

    // 1. Create Viewer Role
    let viewerRole = await prisma.role.findUnique({ where: { name: 'Viewer' } });
    if (!viewerRole) {
        console.log('Creating Viewer Role...');
        viewerRole = await prisma.role.create({
            data: {
                name: 'Viewer',
                description: 'Read-only access to Inventory',
                permissions: {
                    create: [
                        { resource: 'INVENTORY', action: 'READ' },
                        { resource: 'REPORTS', action: 'READ' }
                    ]
                }
            }
        });
    } else {
        console.log('Viewer Role exists. Updating permissions...');
        // Clear existing permissions and re-add
        await prisma.permission.deleteMany({ where: { roleId: viewerRole.id } });
        await prisma.permission.createMany({
            data: [
                { roleId: viewerRole.id, resource: 'INVENTORY', action: 'READ' },
                { roleId: viewerRole.id, resource: 'REPORTS', action: 'READ' }
            ]
        });
    }

    // 2. Create Viewer User
    const email = 'viewer@labamu.co.id';
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        console.log('Viewer user already exists. Updating role...');
        await prisma.user.update({
            where: { email },
            data: { roles: { connect: { id: viewerRole.id } }, password: 'viewer' }
        });
    } else {
        console.log('Creating Viewer user...');
        await prisma.user.create({
            data: {
                name: 'Viewer User',
                email,
                password: 'viewer',
                roles: { connect: { id: viewerRole.id } }
            }
        });
    }

    console.log('Viewer User Seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
