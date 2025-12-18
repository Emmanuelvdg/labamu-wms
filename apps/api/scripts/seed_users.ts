
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // Seed Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrator with full access',
        }
    });

    // Seed Permissions for Admin
    const permissions = [
        { resource: 'ALL', action: 'MANAGE', description: 'Full Access' },
        { resource: 'INVENTORY', action: 'READ', description: 'View Inventory' },
        { resource: 'INVENTORY', action: 'CREATE', description: 'Create Inventory' },
        { resource: 'INVENTORY', action: 'UPDATE', description: 'Update Inventory' },
        { resource: 'INVENTORY', action: 'DELETE', description: 'Delete Inventory' },
        { resource: 'ORDERS', action: 'READ', description: 'View Orders' },
        { resource: 'ORDERS', action: 'CREATE', description: 'Create Orders' },
        { resource: 'ORDERS', action: 'UPDATE', description: 'Update Orders' },
        { resource: 'ORDERS', action: 'DELETE', description: 'Delete Orders' },
        { resource: 'SETTINGS', action: 'READ', description: 'View Settings' },
        { resource: 'SETTINGS', action: 'UPDATE', description: 'Update Settings' },
        { resource: 'PURCHASE_ORDERS', action: 'READ', description: 'View Purchase Orders' },
        { resource: 'SUPPLIERS', action: 'READ', description: 'View Suppliers' },
        { resource: 'INVOICES', action: 'READ', description: 'View Invoices' },
        { resource: 'REPORTS', action: 'READ', description: 'View Reports' },
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: {
                roleId_resource_action: {
                    roleId: adminRole.id,
                    resource: p.resource,
                    action: p.action
                }
            },
            update: {},
            create: {
                roleId: adminRole.id,
                resource: p.resource,
                action: p.action,
            },
        });
    }

    // Seed Admin User
    const adminEmail = 'admin@labamu.co.id';
    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            roles: {
                connect: { id: adminRole.id }
            }
        },
        create: {
            name: 'Admin User',
            email: adminEmail,
            password: 'password123', // In a real app, hash this!
            roles: {
                connect: { id: adminRole.id }
            }
        }
    });

    console.log(`Seeding completed. Admin user: ${user.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
