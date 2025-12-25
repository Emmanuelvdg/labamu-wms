import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaServiceimport { AppModule } from '../src/app.module';

describe('User Management API (e2e)', () => {
    let app: INestApplication;
    let adminUserId: string;
    let testRoleId: string;
    let testWarehouseId: string;
    let createdUserId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup: Get admin user ID and create test data
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@labamu.co.id' },
        });
        adminUserId = adminUser.id;

        // Create test role
        const testRole = await prisma.role.create({
            data: {
                name: 'E2E Test Role',
                description: 'Role for E2E testing',
                permissions: {
                    create: [
                        { resource: 'INVENTORY', action: 'READ' },
                    ],
                },
            },
        });
        testRoleId = testRole.id;

        // Get a warehouse
        const warehouse = await prisma.warehouse.findFirst();
        testWarehouseId = warehouse?.id;

        await prisma.$disconnect();
    });

    afterAll(async () => {
        // Cleanup: Delete created test data
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        if (createdUserId) {
            await prisma.user.delete({ where: { id: createdUserId } }).catch(() => { });
        }

        await prisma.role.delete({ where: { id: testRoleId } }).catch(() => { });
        await prisma.$disconnect();

        await app.close();
    });

    describe('POST /settings/users', () => {
        it('should create user with role assignment', async () => {
            const response = await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', adminUserId)
                .send({
                    name: 'E2E Test User',
                    email: `e2e_test_${Date.now()}@example.com`,
                    password: 'TestPassword123!',
                    roleIds: [testRoleId],
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('E2E Test User');
            expect(response.body.roles).toHaveLength(1);
            expect(response.body.roles[0].id).toBe(testRoleId);

            createdUserId = response.body.id;
        });

        it('should create user with role and warehouse assignment', async () => {
            if (!testWarehouseId) {
                return; // Skip if no warehouse available
            }

            const response = await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', adminUserId)
                .send({
                    name: 'E2E Test User With Warehouse',
                    email: `e2e_wh_${Date.now()}@example.com`,
                    password: 'TestPassword123!',
                    roleIds: [testRoleId],
                    warehouseIds: [testWarehouseId],
                })
                .expect(201);

            expect(response.body.roles).toHaveLength(1);
            expect(response.body.warehouses).toHaveLength(1);
            expect(response.body.warehouses[0].id).toBe(testWarehouseId);

            // Cleanup
            await request(app.getHttpServer())
                .delete(`/settings/users/${response.body.id}`)
                .set('x-user-id', adminUserId)
                .expect(200);
        });

        it('should fail without required permissions', async () => {
            // Create a user without SETTINGS:UPDATE permission
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const limitedRole = await prisma.role.create({
                data: {
                    name: 'Limited Role',
                    permissions: {
                        create: [{ resource: 'INVENTORY', action: 'READ' }],
                    },
                },
            });

            const limitedUser = await prisma.user.create({
                data: {
                    name: 'Limited User',
                    email: `limited_${Date.now()}@example.com`,
                    password: 'password',
                    roles: { connect: [{ id: limitedRole.id }] },
                },
            });

            await prisma.$disconnect();

            await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', limitedUser.id)
                .send({
                    name: 'Unauthorized User',
                    email: `unauth_${Date.now()}@example.com`,
                    password: 'password',
                })
                .expect(403);

            // Cleanup
            const prisma2 = new PrismaClient();
            await prisma2.user.delete({ where: { id: limitedUser.id } });
            await prisma2.role.delete({ where: { id: limitedRole.id } });
            await prisma2.$disconnect();
        });

        it('should fail with duplicate email', async () => {
            const email = `duplicate_${Date.now()}@example.com`;

            // Create first user
            await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', adminUserId)
                .send({
                    name: 'First User',
                    email,
                    password: 'password',
                })
                .expect(201);

            // Try to create duplicate
            await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', adminUserId)
                .send({
                    name: 'Duplicate User',
                    email,
                    password: 'password',
                })
                .expect(400);
        });
    });

    describe('GET /settings/users', () => {
        it('should return all users with roles and warehouses', async () => {
            const response = await request(app.getHttpServer())
                .get('/settings/users')
                .set('x-user-id', adminUserId)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            const firstUser = response.body[0];
            expect(firstUser).toHaveProperty('id');
            expect(firstUser).toHaveProperty('email');
            expect(firstUser).toHaveProperty('roles');
            expect(firstUser).toHaveProperty('warehouses');
        });

        it('should fail without permissions', async () => {
            await request(app.getHttpServer())
                .get('/settings/users')
                .expect(401); // No x-user-id header
        });
    });

    describe('PUT /settings/users/:id', () => {
        it('should update user details', async () => {
            if (!createdUserId) {
                // Create a user first
                const createResponse = await request(app.getHttpServer())
                    .post('/settings/users')
                    .set('x-user-id', adminUserId)
                    .send({
                        name: 'User To Update',
                        email: `to_update_${Date.now()}@example.com`,
                        password: 'password',
                    });
                createdUserId = createResponse.body.id;
            }

            const response = await request(app.getHttpServer())
                .put(`/settings/users/${createdUserId}`)
                .set('x-user-id', adminUserId)
                .send({
                    name: 'Updated Name',
                })
                .expect(200);

            expect(response.body.name).toBe('Updated Name');
        });

        it('should update user roles', async () => {
            const response = await request(app.getHttpServer())
                .put(`/settings/users/${createdUserId}`)
                .set('x-user-id', adminUserId)
                .send({
                    roleIds: [testRoleId],
                })
                .expect(200);

            expect(response.body.roles).toHaveLength(1);
            expect(response.body.roles[0].id).toBe(testRoleId);
        });
    });

    describe('POST /settings/users/:id/reset-password', () => {
        it('should reset user password', async () => {
            if (!createdUserId) {
                // Create a user first
                const createResponse = await request(app.getHttpServer())
                    .post('/settings/users')
                    .set('x-user-id', adminUserId)
                    .send({
                        name: 'User For Password Reset',
                        email: `pwd_reset_${Date.now()}@example.com`,
                        password: 'OldPassword123!',
                    });
                createdUserId = createResponse.body.id;
            }

            const response = await request(app.getHttpServer())
                .post(`/settings/users/${createdUserId}/reset-password`)
                .set('x-user-id', adminUserId)
                .send({
                    newPassword: 'NewPassword123!',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            // Note: Cannot verify password directly as it should be hashed
        });
    });

    describe('DELETE /settings/users/:id', () => {
        it('should delete a user', async () => {
            // Create a user to delete
            const createResponse = await request(app.getHttpServer())
                .post('/settings/users')
                .set('x-user-id', adminUserId)
                .send({
                    name: 'User To Delete',
                    email: `to_delete_${Date.now()}@example.com`,
                    password: 'password',
                })
                .expect(201);

            const userIdToDelete = createResponse.body.id;

            await request(app.getHttpServer())
                .delete(`/settings/users/${userIdToDelete}`)
                .set('x-user-id', adminUserId)
                .expect(200);

            // Verify user is deleted
            await request(app.getHttpServer())
                .get(`/settings/users/${userIdToDelete}`)
                .set('x-user-id', adminUserId)
                .expect(404);
        });
    });
});
