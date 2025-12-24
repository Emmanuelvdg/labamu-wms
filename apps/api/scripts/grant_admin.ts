
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function grantAdmin() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    console.log('Granting Admin Permissions...');

    try {
        // 1. Ensure Role ADMIN exists (Upsert)
        const role = await prisma.role.upsert({
            where: { name: 'ADMIN' },
            update: {},
            create: {
                name: 'ADMIN',
                description: 'System Administrator',
                isSystem: true
            }
        });
        console.log(`Role ADMIN ensured (ID: ${role.id})`);

        // 2. Ensure Role has ALL:MANAGE permission (Upsert)
        // Note: Permission has a unique constraint [roleId, resource, action]
        await prisma.permission.upsert({
            where: {
                roleId_resource_action: {
                    roleId: role.id,
                    resource: 'ALL',
                    action: 'MANAGE'
                }
            },
            update: {},
            create: {
                roleId: role.id,
                resource: 'ALL',
                action: 'MANAGE'
            }
        });
        console.log('Permission ALL:MANAGE ensured for ADMIN role.');

        // 3. Upsert User and Assign Role
        const user = await prisma.user.upsert({
            where: { email: 'admin@labamu.co.id' },
            update: {
                roles: {
                    connect: { id: role.id }
                }
            },
            create: {
                email: 'admin@labamu.co.id',
                name: 'System Admin',
                password: 'admin', // In real app, hash this!
                roles: {
                    connect: { id: role.id }
                }
            }
        });
        console.log(`User admin@labamu.co.id ensured (ID: ${user.id}). Assigned ADMIN role.`);
        console.log('SUCCESS: Admin permissions granted.');

    } catch (e) {
        console.error('Error granting permissions:', e);
    }

    await app.close();
}
grantAdmin();
