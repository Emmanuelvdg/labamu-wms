import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminRoles() {
    console.log('=== Fixing Admin User Roles ===\n');

    // Step 1: Find or create Admin role
    let adminRole = await prisma.role.findUnique({
        where: { name: 'Admin' },
        include: { permissions: true }
    });

    if (!adminRole) {
        console.log('Creating Admin role...');
        adminRole = await prisma.role.create({
            data: {
                name: 'Admin',
                description: 'Full system administrator',
                isSystem: true,
                permissions: {
                    create: [
                        { resource: '*', action: '*' }
                    ]
                }
            },
            include: { permissions: true }
        });
        console.log('✓ Admin role created with wildcard permissions');
    } else {
        console.log('✓ Admin role exists');

        // Check if admin has wildcard permission
        const hasWildcard = adminRole.permissions.some(
            p => p.resource === '*' && p.action === '*'
        );

        if (!hasWildcard) {
            console.log('Adding wildcard permission to Admin role...');
            await prisma.permission.create({
                data: {
                    roleId: adminRole.id,
                    resource: '*',
                    action: '*'
                }
            });
            console.log('✓ Wildcard permission added');
        }
    }

    // Step 2: Find admin user
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@labamu.co.id' },
        include: {
            roles: true
        }
    });

    if (!admin) {
        console.log('\n❌ Admin user not found! Please create admin user first.');
        await prisma.$disconnect();
        return;
    }

    console.log(`\nFound admin user: ${admin.email}`);
    console.log(`Current roles: ${admin.roles.map(r => r.name).join(', ') || 'NONE'}`);

    // Step 3: Assign Admin role to admin user
    const hasAdminRole = admin.roles.some(r => r.id === adminRole.id);

    if (!hasAdminRole) {
        console.log('\nAssigning Admin role to admin user...');
        await prisma.user.update({
            where: { id: admin.id },
            data: {
                roles: {
                    connect: { id: adminRole.id }
                }
            }
        });
        console.log('✓ Admin role assigned');
    } else {
        console.log('\n✓ Admin user already has Admin role');
    }

    // Step 4: Verify
    const verifyAdmin = await prisma.user.findUnique({
        where: { email: 'admin@labamu.co.id' },
        include: {
            roles: {
                include: {
                    permissions: true
                }
            }
        }
    });

    if (!verifyAdmin) {
        console.log('\n❌ Unable to verify admin user!');
        await prisma.$disconnect();
        return;
    }

    console.log('\n=== Verification ===');
    console.log(`User: ${verifyAdmin.email}`);
    console.log(`Roles: ${verifyAdmin.roles.map(r => r.name).join(', ')}`);
    console.log(`Permissions:`);
    verifyAdmin.roles.forEach(role => {
        console.log(`  ${role.name}:`);
        role.permissions.forEach(p => {
            console.log(`    - ${p.resource}:${p.action}`);
        });
    });

    console.log('\n✅ Admin user fixed! You can now access the application.');

    await prisma.$disconnect();
}

fixAdminRoles().catch(console.error);
