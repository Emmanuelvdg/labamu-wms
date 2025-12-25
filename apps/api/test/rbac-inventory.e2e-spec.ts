import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('RBAC Integration Tests - Inventory', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    // Test users
    let adminUserId: string;
    let managerUserId: string;
    let workerUserId: string;
    let viewerUserId: string;

    // Test role and permission IDs
    let adminRoleId: string;
    let managerRoleId: string;
    let workerRoleId: string;
    let viewerRoleId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Setup test data
        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });

    async function setupTestData() {
        // Create Admin Role with all permissions
        const adminRole = await prisma.role.create({
            data: {
                name: 'Test Admin',
                description: 'Admin with all permissions',
                isSystem: false,
            },
        });
        adminRoleId = adminRole.id;

        await prisma.permission.createMany({
            data: [
                { roleId: adminRoleId, resource: '*', action: '*' },
            ],
        });

        // Create Manager Role with inventory permissions
        const managerRole = await prisma.role.create({
            data: {
                name: 'Test Manager',
                description: 'Manager with inventory permissions',
                isSystem: false,
            },
        });
        managerRoleId = managerRole.id;

        await prisma.permission.createMany({
            data: [
                { roleId: managerRoleId, resource: 'INVENTORY', action: 'CREATE' },
                { roleId: managerRoleId, resource: 'INVENTORY', action: 'READ' },
                { roleId: managerRoleId, resource: 'INVENTORY', action: 'UPDATE' },
                { roleId: managerRoleId, resource: 'WAREHOUSE', action: 'CREATE' },
                { roleId: managerRoleId, resource: 'WAREHOUSE', action: 'UPDATE' },
            ],
        });

        // Create Worker Role with limited permissions
        const workerRole = await prisma.role.create({
            data: {
                name: 'Test Worker',
                description: 'Worker with read and update only',
                isSystem: false,
            },
        });
        workerRoleId = workerRole.id;

        await prisma.permission.createMany({
            data: [
                { roleId: workerRoleId, resource: 'INVENTORY', action: 'READ' },
                { roleId: workerRoleId, resource: 'INVENTORY', action: 'UPDATE' },
            ],
        });

        // Create Viewer Role with read-only permission
        const viewerRole = await prisma.role.create({
            data: {
                name: 'Test Viewer',
                description: 'Read-only access',
                isSystem: false,
            },
        });
        viewerRoleId = viewerRole.id;

        await prisma.permission.createMany({
            data: [
                { roleId: viewerRoleId, resource: '*', action: 'READ' },
            ],
        });

        // Create test users
        const adminUser = await prisma.user.create({
            data: {
                email: 'admin@test.com',
                password: 'hashed_password',
                name: 'Test Admin User',
                roles: { connect: [{ id: adminRoleId }] },
            },
        });
        adminUserId = adminUser.id;

        const managerUser = await prisma.user.create({
            data: {
                email: 'manager@test.com',
                password: 'hashed_password',
                name: 'Test Manager User',
                roles: { connect: [{ id: managerRoleId }] },
            },
        });
        managerUserId = managerUser.id;

        const workerUser = await prisma.user.create({
            data: {
                email: 'worker@test.com',
                password: 'hashed_password',
                name: 'Test Worker User',
                roles: { connect: [{ id: workerRoleId }] },
            },
        });
        workerUserId = workerUser.id;

        const viewerUser = await prisma.user.create({
            data: {
                email: 'viewer@test.com',
                password: 'hashed_password',
                name: 'Test Viewer User',
                roles: { connect: [{ id: viewerRoleId }] },
            },
        });
        viewerUserId = viewerUser.id;
    }

    async function cleanupTestData() {
        // Delete in correct order (permissions -> roles -> users)
        await prisma.permission.deleteMany({
            where: {
                roleId: { in: [adminRoleId, managerRoleId, workerRoleId, viewerRoleId] },
            },
        });

        await prisma.user.deleteMany({
            where: {
                id: { in: [adminUserId, managerUserId, workerUserId, viewerUserId] },
            },
        });

        await prisma.role.deleteMany({
            where: {
                id: { in: [adminRoleId, managerRoleId, workerRoleId, viewerRoleId] },
            },
        });
    }

    describe('Product Creation (INVENTORY:CREATE)', () => {
        const productData = {
            name: 'Test Product',
            sku: 'TEST-SKU-001',
            category: 'TEST_CATEGORY',
        };

        it('should allow admin to create product', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .set('x-user-id', adminUserId)
                .send(productData)
                .expect(201);
        });

        it('should allow manager to create product', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .set('x-user-id', managerUserId)
                .send({ ...productData, sku: 'TEST-SKU-002' })
                .expect(201);
        });

        it('should deny worker from creating product', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .set('x-user-id', workerUserId)
                .send({ ...productData, sku: 'TEST-SKU-003' })
                .expect(403)
                .expect((res) => {
                    expect(res.body.message).toContain('Insufficient permissions');
                    expect(res.body.message).toContain('INVENTORY:CREATE');
                });
        });

        it('should deny viewer from creating product', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .set('x-user-id', viewerUserId)
                .send({ ...productData, sku: 'TEST-SKU-004' })
                .expect(403);
        });
    });

    describe('Product Reading (INVENTORY:READ)', () => {
        it('should allow admin to read products', () => {
            return request(app.getHttpServer())
                .get('/inventory/products')
                .set('x-user-id', adminUserId)
                .expect(200);
        });

        it('should allow manager to read products', () => {
            return request(app.getHttpServer())
                .get('/inventory/products')
                .set('x-user-id', managerUserId)
                .expect(200);
        });

        it('should allow worker to read products', () => {
            return request(app.getHttpServer())
                .get('/inventory/products')
                .set('x-user-id', workerUserId)
                .expect(200);
        });

        it('should allow viewer to read products (wildcard READ)', () => {
            return request(app.getHttpServer())
                .get('/inventory/products')
                .set('x-user-id', viewerUserId)
                .expect(200);
        });
    });

    describe('Product Update (INVENTORY:UPDATE)', () => {
        let testProductId: string;

        beforeAll(async () => {
            // Create a test product for updates
            const product = await prisma.product.create({
                data: {
                    name: 'Update Test Product',
                    sku: 'UPDATE-TEST-001',
                },
            });
            testProductId = product.id;
        });

        it('should allow admin to update product', () => {
            return request(app.getHttpServer())
                .put(`/inventory/products/${testProductId}`)
                .set('x-user-id', adminUserId)
                .send({ name: 'Updated by Admin' })
                .expect(200);
        });

        it('should allow manager to update product', () => {
            return request(app.getHttpServer())
                .put(`/inventory/products/${testProductId}`)
                .set('x-user-id', managerUserId)
                .send({ name: 'Updated by Manager' })
                .expect(200);
        });

        it('should allow worker to update product', () => {
            return request(app.getHttpServer())
                .put(`/inventory/products/${testProductId}`)
                .set('x-user-id', workerUserId)
                .send({ name: 'Updated by Worker' })
                .expect(200);
        });

        it('should deny viewer from updating product', () => {
            return request(app.getHttpServer())
                .put(`/inventory/products/${testProductId}`)
                .set('x-user-id', viewerUserId)
                .send({ name: 'Should Fail' })
                .expect(403);
        });
    });

    describe('Warehouse Operations', () => {
        const warehouseData = {
            name: 'Test Warehouse RBAC',
            shortName: 'TWRB',
            address: '123 Test St',
            location: { address: '123 Test St' },
            type: 'PHYSICAL',
        };

        it('should allow admin to create warehouse', () => {
            return request(app.getHttpServer())
                .post('/inventory/warehouses')
                .set('x-user-id', adminUserId)
                .send(warehouseData)
                .expect(201);
        });

        it('should allow manager to create warehouse', () => {
            return request(app.getHttpServer())
                .post('/inventory/warehouses')
                .set('x-user-id', managerUserId)
                .send({ ...warehouseData, shortName: 'TWR2' })
                .expect(201);
        });

        it('should deny worker from creating warehouse', () => {
            return request(app.getHttpServer())
                .post('/inventory/warehouses')
                .set('x-user-id', workerUserId)
                .send({ ...warehouseData, shortName: 'TWR3' })
                .expect(403);
        });
    });

    describe('Adjustments (ADJUSTMENTS:CREATE)', () => {
        let testProductId: string;
        let testLocationId: string;

        beforeAll(async () => {
            const product = await prisma.product.create({
                data: { name: 'Adjustment Test Product', sku: 'ADJ-TEST-001' },
            });
            testProductId = product.id;

            const location = await prisma.location.create({
                data: { name: 'Adjustment Test Location', type: 'INTERNAL' },
            });
            testLocationId = location.id;
        });

        const adjustmentData = {
            reason: 'Testing RBAC',
            type: 'CYCLE_COUNT',
        };

        it('should allow admin to create adjustment', () => {
            return request(app.getHttpServer())
                .post('/inventory/adjustments')
                .set('x-user-id', adminUserId)
                .send({
                    ...adjustmentData,
                    items: [{ productId: testProductId, locationId: testLocationId, quantity: 10 }],
                })
                .expect(201);
        });

        it('should deny viewer from creating adjustment', () => {
            return request(app.getHttpServer())
                .post('/inventory/adjustments')
                .set('x-user-id', viewerUserId)
                .send({
                    ...adjustmentData,
                    items: [{ productId: testProductId, locationId: testLocationId, quantity: 5 }],
                })
                .expect(403);
        });
    });

    describe('Missing User Header', () => {
        it('should return 401 when x-user-id header is missing', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .send({ name: 'Test', sku: 'TEST' })
                .expect(401)
                .expect((res) => {
                    expect(res.body.message).toBe('User not identified');
                });
        });
    });

    describe('Invalid User', () => {
        it('should return 401 when user does not exist', () => {
            return request(app.getHttpServer())
                .post('/inventory/products')
                .set('x-user-id', 'nonexistent-user-id')
                .send({ name: 'Test', sku: 'TEST' })
                .expect(401)
                .expect((res) => {
                    expect(res.body.message).toBe('User not found');
                });
        });
    });
});
