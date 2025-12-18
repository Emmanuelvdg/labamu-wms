import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed Picking Strategies
    const pickingStrategies = [
        { name: 'Single', rules: JSON.stringify({ description: 'Process one order at a time' }) },
        { name: 'Cluster', rules: JSON.stringify({ description: 'Group orders by zone' }) },
        { name: 'Wave', rules: JSON.stringify({ description: 'Collect orders in scheduled waves' }) },
        { name: 'Batch', rules: JSON.stringify({ description: 'Pick multiple orders simultaneously' }) },
    ];

    for (const strategy of pickingStrategies) {
        await prisma.pickingStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }

    // Seed Reservation Strategies
    const reservationStrategies = [
        { name: 'FIFO', rules: JSON.stringify({ description: 'First In, First Out' }) },
        { name: 'FEFO', rules: JSON.stringify({ description: 'First Expiry, First Out' }) },
        { name: 'Location', rules: JSON.stringify({ description: 'Prioritize specific warehouses' }) },
    ];

    for (const strategy of reservationStrategies) {
        await prisma.reservationStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }

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
    await prisma.user.upsert({
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

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
