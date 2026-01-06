
import { PrismaClient } from '@labamu/database';
// import * as bcrypt from 'bcryptjs'; // Not available, using hardcoded hash

const prisma = new PrismaClient();

async function seedAdmin() {
    try {
        const email = 'admin@example.com';
        // Hashed 'admin123' (bcrypt cost 10)
        const hashedPassword = '$2a$10$EpRnTzVlqHNP0.fUbXUwSO90oCNI7iDbO/r0j8aJk.T/1UBye0/Lq';

        // 1. Ensure Role exists
        let adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' }
        });

        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'ADMIN',
                    description: 'System Administrator',
                    isSystem: true
                }
            });
            console.log('✅ Created ADMIN Role');
        }

        // 3. Create/Update User
        const existing = await prisma.user.findUnique({ where: { email } });

        if (!existing) {
            await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: 'Admin User',
                    roles: {
                        connect: { id: adminRole.id }
                    }
                }
            });
            console.log('✅ Admin user created');
        } else {
            // Update password and ensure role
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    roles: {
                        connect: { id: adminRole.id }
                    }
                }
            });
            console.log('✅ Admin user updated');
        }
    } catch (e) {
        console.error('Error seeding admin', e);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
