import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Seed Picking Strategies
    // Seed Picking Strategies (Temporarily commented out due to schema mismatch)
    /*
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
    */

    // Seed Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrator with full access',
        }
    });

    // Seed Default Outbound Route Templates
    const defaultTemplates = [
        {
            name: 'Default 1-Step Shipping',
            triggerType: 'OUTBOUND',
            status: 'ACTIVE',
            steps: [
                { type: 'WAVELESS_PICK', name: 'Pick', isStart: true, order: 1, positionX: 100, positionY: 100 },
                { type: 'SHIP', name: 'Ship', isEnd: true, order: 2, positionX: 300, positionY: 100 }
            ],
            transitions: [
                { fromStepName: 'Pick', toStepName: 'Ship', order: 1 }
            ]
        },
        {
            name: 'Default 3-Step QC Outbound',
            triggerType: 'OUTBOUND',
            status: 'ACTIVE',
            steps: [
                { type: 'BATCH_PICK', name: 'Pick', isStart: true, order: 1, positionX: 100, positionY: 100 },
                { type: 'QC_INSPECT', name: 'QC', order: 2, positionX: 300, positionY: 100 },
                { type: 'PACK', name: 'Pack', order: 3, positionX: 500, positionY: 100 },
                { type: 'SHIP', name: 'Ship', isEnd: true, order: 4, positionX: 700, positionY: 100 }
            ],
            transitions: [
                { fromStepName: 'Pick', toStepName: 'QC', order: 1 },
                { fromStepName: 'QC', toStepName: 'Pack', order: 2, condition: '{"field":"context.isHighValueOrder","op":"eq","value":true}' },
                { fromStepName: 'QC', toStepName: 'Ship', order: 3 }, // Default fallback if condition fails
                { fromStepName: 'Pack', toStepName: 'Ship', order: 4 }
            ]
        },
        {
            name: 'Default 1-Step Receipt',
            triggerType: 'ROUTE',
            status: 'ACTIVE',
            steps: [
                { type: 'PUTAWAY', name: 'Putaway', isStart: true, isEnd: true, order: 1, positionX: 100, positionY: 100 }
            ],
            transitions: []
        },
        {
            name: 'Default 3-Step QC Inbound',
            triggerType: 'ROUTE',
            status: 'ACTIVE',
            steps: [
                { type: 'PUTAWAY', name: 'Input', isStart: true, order: 1, positionX: 100, positionY: 100 },
                { type: 'QC_INSPECT', name: 'QC', order: 2, positionX: 300, positionY: 100 },
                { type: 'PUTAWAY', name: 'Stock', isEnd: true, order: 3, positionX: 500, positionY: 100 }
            ],
            transitions: [
                { fromStepName: 'Input', toStepName: 'QC', order: 1 },
                { fromStepName: 'QC', toStepName: 'Stock', order: 2 }
            ]
        }
    ];

    for (const tpl of defaultTemplates) {
        const existing = await prisma.workflowTemplate.findFirst({ where: { name: tpl.name } });
        if (!existing) {
            const template = await prisma.workflowTemplate.create({
                data: {
                    name: tpl.name,
                    triggerType: tpl.triggerType,
                    status: tpl.status,
                }
            });

            const stepRecords: any = {};
            for (const step of tpl.steps) {
                stepRecords[step.name] = await prisma.workflowStep.create({
                    data: {
                        templateId: template.id,
                        type: step.type,
                        name: step.name,
                        isStart: step.isStart || false,
                        isEnd: step.isEnd || false,
                        order: step.order,
                        positionX: step.positionX,
                        positionY: step.positionY
                    }
                });
            }

            for (const trans of tpl.transitions) {
                await prisma.workflowTransition.create({
                    data: {
                        templateId: template.id,
                        fromStepId: stepRecords[trans.fromStepName].id,
                        toStepId: stepRecords[trans.toStepName].id,
                        order: trans.order,
                        condition: trans.condition || '{}'
                    }
                });
            }
        }
    }

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
            password: await bcrypt.hash('password123', 10),
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
