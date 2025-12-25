import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('RBAC Integration Tests - Orders & Purchase Orders', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let adminUserId: string;
    let approverUserId: string;
    let workerUserId: string;

    let adminRoleId: string;
    let approverRoleId: string;
    let workerRoleId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });

    async function setupTestData() {
        // Admin Role
        const adminRole = await prisma.role.create({
            data: { name: 'Test Orders Admin', isSystem: false },
        });
        adminRoleId = adminRole.id;
        await prisma.permission.create({
            data: { roleId: adminRoleId, resource: '*', action: '*' },
        });

        // Approver Role
        const approverRole = await prisma.role.create({
            data: { name: 'Test Approver', isSystem: false },
        });
        approverRoleId = approverRole.id;
        await prisma.permission.createMany({
            data: [
                { roleId: approverRoleId, resource: 'ORDERS', action: 'APPROVE' },
                { roleId: approverRoleId, resource: 'ORDERS', action: 'READ' },
                { roleId: approverRoleId, resource: 'PURCHASE_ORDERS', action: 'APPROVE' },
                { roleId: approverRoleId, resource: 'PURCHASE_ORDERS', action: 'READ' },
            ],
        });

        // Worker Role
        const workerRole = await prisma.role.create({
            data: { name: 'Test Order Worker', isSystem: false },
        });
        workerRoleId = workerRole.id;
        await prisma.permission.createMany({
            data: [
                { roleId: workerRoleId, resource: 'ORDERS', action: 'CREATE' },
                { roleId: workerRoleId, resource: 'ORDERS', action: 'READ' },
                { roleId: workerRoleId, resource: 'PURCHASE_ORDERS', action: 'CREATE' },
                { roleId: workerRoleId, resource: 'PURCHASE_ORDERS', action: 'READ' },
            ],
        });

        // Create users
        const adminUser = await prisma.user.create({
            data: {
                email: 'orders-admin@test.com',
                password: 'hash',
                name: 'Orders Admin',
                roles: { connect: [{ id: adminRoleId }] },
            },
        });
        adminUserId = adminUser.id;

        const approverUser = await prisma.user.create({
            data: {
                email: 'approver@test.com',
                password: 'hash',
                name: 'Approver User',
                roles: { connect: [{ id: approverRoleId }] },
            },
        });
        approverUserId = approverUser.id;

        const workerUser = await prisma.user.create({
            data: {
                email: 'orders-worker@test.com',
                password: 'hash',
                name: 'Orders Worker',
                roles: { connect: [{ id: workerRoleId }] },
            },
        });
        workerUserId = workerUser.id;
    }

    async function cleanupTestData() {
        await prisma.permission.deleteMany({
            where: { roleId: { in: [adminRoleId, approverRoleId, workerRoleId] } },
        });
        await prisma.user.deleteMany({
            where: { id: { in: [adminUserId, approverUserId, workerUserId] } },
        });
        await prisma.role.deleteMany({
            where: { id: { in: [adminRoleId, approverRoleId, workerRoleId] } },
        });
    }

    describe('Order Creation (ORDERS:CREATE)', () => {
        let testProductId: string;
        let testCustomerId: string;

        beforeAll(async () => {
            const product = await prisma.product.create({
                data: { name: 'Order Test Product', sku: 'ORDER-TEST-001' },
            });
            testProductId = product.id;

            const customer = await prisma.customer.create({
                data: { name: 'Test Customer', email: 'customer@test.com' },
            });
            testCustomerId = customer.id;
        });

        const orderData = {
            customerId: '',
            priority: 'NORMAL',
            items: [],
        };

        beforeEach(() => {
            orderData.customerId = testCustomerId;
            orderData.items = [{ productId: testProductId, quantity: 5 }];
        });

        it('should allow admin to create order', () => {
            return request(app.getHttpServer())
                .post('/orders')
                .set('x-user-id', adminUserId)
                .send(orderData)
                .expect(201);
        });

        it('should allow worker to create order', () => {
            return request(app.getHttpServer())
                .post('/orders')
                .set('x-user-id', workerUserId)
                .send(orderData)
                .expect(201);
        });

        it('should deny approver from creating order (no CREATE permission)', () => {
            return request(app.getHttpServer())
                .post('/orders')
                .set('x-user-id', approverUserId)
                .send(orderData)
                .expect(403)
                .expect((res) => {
                    expect(res.body.message).toContain('ORDERS:CREATE');
                });
        });
    });

    describe('Order Approval (ORDERS:APPROVE)', () => {
        let testOrderId: string;

        beforeAll(async () => {
            const product = await prisma.product.create({
                data: { name: 'Approval Test Product', sku: 'APPROVE-TEST-001' },
            });

            const customer = await prisma.customer.create({
                data: { name: 'Approval Test Customer', email: 'approve@test.com' },
            });

            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 10,
                            unitPrice: 100,
                        }],
                    },
                },
            });
            testOrderId = order.id;
        });

        it('should allow admin to approve order', () => {
            return request(app.getHttpServer())
                .post(`/orders/${testOrderId}/approve`)
                .set('x-user-id', adminUserId)
                .expect(201);
        });

        it('should allow approver to approve order', async () => {
            // Create a new order for this test
            const product = await prisma.product.findFirst();
            const customer = await prisma.customer.findFirst();
            const newOrder = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{ productId: product.id, quantity: 5, unitPrice: 50 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/orders/${newOrder.id}/approve`)
                .set('x-user-id', approverUserId)
                .expect(201);
        });

        it('should deny worker from approving order', async () => {
            const product = await prisma.product.findFirst();
            const customer = await prisma.customer.findFirst();
            const workerOrder = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{ productId: product.id, quantity: 3, unitPrice: 30 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/orders/${workerOrder.id}/approve`)
                .set('x-user-id', workerUserId)
                .expect(403)
                .expect((res) => {
                    expect(res.body.message).toContain('ORDERS:APPROVE');
                });
        });
    });

    describe('Purchase Order Approval (PURCHASE_ORDERS:APPROVE)', () => {
        let testPOId: string;

        beforeAll(async () => {
            const product = await prisma.product.create({
                data: { name: 'PO Test Product', sku: 'PO-TEST-001' },
            });

            const supplier = await prisma.supplier.create({
                data: { name: 'Test Supplier', email: 'supplier@test.com' },
            });

            const po = await prisma.purchaseOrder.create({
                data: {
                    supplierId: supplier.id,
                    status: 'PENDING_APPROVAL',
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 100,
                            unitCost: 50,
                        }],
                    },
                },
            });
            testPOId = po.id;
        });

        it('should allow admin to approve PO', () => {
            return request(app.getHttpServer())
                .post(`/purchase-orders/${testPOId}/approve`)
                .set('x-user-id', adminUserId)
                .send({ userId: adminUserId })
                .expect(201);
        });

        it('should allow approver to approve PO', async () => {
            const product = await prisma.product.findFirst();
            const supplier = await prisma.supplier.findFirst();
            const newPO = await prisma.purchaseOrder.create({
                data: {
                    supplierId: supplier.id,
                    status: 'PENDING_APPROVAL',
                    items: {
                        create: [{ productId: product.id, quantity: 50, unitCost: 25 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/purchase-orders/${newPO.id}/approve`)
                .set('x-user-id', approverUserId)
                .send({ userId: approverUserId })
                .expect(201);
        });

        it('should deny worker from approving PO', async () => {
            const product = await prisma.product.findFirst();
            const supplier = await prisma.supplier.findFirst();
            const workerPO = await prisma.purchaseOrder.create({
                data: {
                    supplierId: supplier.id,
                    status: 'PENDING_APPROVAL',
                    items: {
                        create: [{ productId: product.id, quantity: 25, unitCost: 10 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/purchase-orders/${workerPO.id}/approve`)
                .set('x-user-id', workerUserId)
                .send({ userId: workerUserId })
                .expect(403)
                .expect((res) => {
                    expect(res.body.message).toContain('PURCHASE_ORDERS:APPROVE');
                });
        });
    });

    describe('Order Cancellation (ORDERS:CANCEL)', () => {
        it('should allow admin to cancel order (wildcard permission)', async () => {
            const product = await prisma.product.findFirst();
            const customer = await prisma.customer.findFirst();
            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{ productId: product.id, quantity: 1, unitPrice: 10 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/orders/${order.id}/cancel`)
                .set('x-user-id', adminUserId)
                .send({ reason: 'Testing cancellation' })
                .expect(201);
        });

        it('should deny worker from canceling order', async () => {
            const product = await prisma.product.findFirst();
            const customer = await prisma.customer.findFirst();
            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status: 'PENDING',
                    priority: 'NORMAL',
                    items: {
                        create: [{ productId: product.id, quantity: 2, unitPrice: 20 }],
                    },
                },
            });

            return request(app.getHttpServer())
                .post(`/orders/${order.id}/cancel`)
                .set('x-user-id', workerUserId)
                .send({ reason: 'Should fail' })
                .expect(403);
        });
    });
});
