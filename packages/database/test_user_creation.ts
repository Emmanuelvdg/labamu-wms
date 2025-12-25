import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testUserCreation() {
    console.log('=== Testing User Creation Directly ===\n');

    try {
        // Test 1: Create user with minimal data
        console.log('Test 1: Creating user with minimal data...');
        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        const user1 = await prisma.user.create({
            data: {
                name: 'Direct Test User 1',
                email: `test_direct_${Date.now()}@example.com`,
                password: hashedPassword,
            },
            include: {
                roles: true,
                warehouses: true,
            }
        });

        console.log('✓ User created successfully (minimal data)');
        console.log('  ID:', user1.id);
        console.log('  Email:', user1.email);
        console.log('  Roles:', user1.roles.length);

        // Test 2: Create user with role assignment
        console.log('\nTest 2: Creating user with role assignment...');

        const adminRole = await prisma.role.findUnique({
            where: { name: 'Admin' }
        });

        if (!adminRole) {
            console.log('  ⚠️  Admin role not found, skipping role assignment test');
        } else {
            const user2 = await prisma.user.create({
                data: {
                    name: 'Direct Test User 2',
                    email: `test_direct_role_${Date.now()}@example.com`,
                    password: hashedPassword,
                    roles: {
                        connect: [{ id: adminRole.id }]
                    }
                },
                include: {
                    roles: true,
                    warehouses: true,
                }
            });

            console.log('✓ User created successfully (with role)');
            console.log('  ID:', user2.id);
            console.log('  Email:', user2.email);
            console.log('  Roles:', user2.roles.map(r => r.name).join(', '));
        }

        // Test 3: Check for any constraint issues
        console.log('\nTest 3: Checking database constraints...');
        const users = await prisma.user.findMany({
            include: {
                roles: true,
            },
            take: 5,
        });
        console.log(`  Found ${users.length} users in database`);

        console.log('\n✅ All direct Prisma tests passed!');
        console.log('   The issue is likely in the UsersService or Controller layer.\n');

    } catch (error: any) {
        console.error('\n❌ Error during user creation test:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        if (error.meta) {
            console.error('   Meta:', JSON.stringify(error.meta, null, 2));
        }
        console.error('\n   Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testUserCreation();
