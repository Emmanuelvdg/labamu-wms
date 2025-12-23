
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { FulfillmentService } from '../src/fulfillment/fulfillment.service';
import { OrderService } from '../src/order/order.service';
import { PrismaService } from '../src/prisma.service';

describe('Configurable Routes (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let fulfillmentService: FulfillmentService;
    let orderService: OrderService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
        fulfillmentService = app.get(FulfillmentService);
        orderService = app.get(OrderService);

        // Ensure System User
        const sysUser = await prisma.user.findFirst({ where: { email: 'system@labamu.io' } });
        if (!sysUser) {
            await prisma.user.create({
                data: {
                    id: 'system-auto-allocation',
                    email: 'system@labamu.io',
                    password: 'x',
                    name: 'System Auto',
                    roles: {
                        create: { name: 'ADMIN' }
                    }
                }
            }).catch(() => { });
        }
    });

    afterAll(async () => {
        await app.close();
    });

    it('should chain rules: Primary(Empty) -> Secondary(Stock) -> Allocated to Secondary', async () => {
        // 1. Setup Data - Warehouses
        let whA = await prisma.warehouse.findFirst({ where: { name: 'Route-A' } });
        if (!whA) whA = await prisma.warehouse.create({ data: { name: 'Route-A', location: '{"lat":0,"lng":0}', type: 'INTERNAL' } });

        let whB = await prisma.warehouse.findFirst({ where: { name: 'Route-B' } });
        if (!whB) whB = await prisma.warehouse.create({ data: { name: 'Route-B', location: '{"lat":10,"lng":10}', type: 'INTERNAL' } });

        const product = await prisma.product.upsert({ where: { sku: 'Route-Prod-1' }, update: {}, create: { sku: 'Route-Prod-1', name: 'Route Test 1', category: 'TEST' } });

        await prisma.productInventory.deleteMany({ where: { productId: product.id } });
        await prisma.productInventory.create({ data: { productId: product.id, warehouseId: whA!.id, quantity: 0, reserved: 0 } });
        await prisma.productInventory.create({ data: { productId: product.id, warehouseId: whB!.id, quantity: 10, reserved: 0 } });

        const cust = await prisma.customer.create({ data: { name: 'Route Cust', latitude: 0, longitude: 0 } });

        // 2. Setup Configurable Rules
        await prisma.fulfillmentRule.create({
            data: { name: 'Rule 1: Try A', priority: 1, strategy: 'PRIMARY', warehouseId: whA!.id, actionIfUnavailable: 'NEXT_RULE' }
        });
        await prisma.fulfillmentRule.create({
            data: { name: 'Rule 2: Try B', priority: 2, strategy: 'PRIMARY', warehouseId: whB!.id, actionIfUnavailable: 'NEXT_RULE' }
        });

        // 3. Execution
        const order = await orderService.createOrder({ customerId: cust.id, priority: 'NORMAL', items: [{ productId: product.id, quantity: 5 }] });
        await fulfillmentService.allocateOrder(order.id);

        // 4. Verify
        const updated = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updated!.warehouseId).toBe(whB!.id);
        expect(updated!.fulfillmentStatus).toBe('ALLOCATED');

        // Cleanup
        await prisma.fulfillmentRule.deleteMany({ where: { name: { contains: 'Rule ' } } });
    });

    it('should trigger transfer: Primary(Empty) -> Trigger IWT from Source', async () => {
        let whA = await prisma.warehouse.findFirst({ where: { name: 'Route-A' } });
        let whB = await prisma.warehouse.findFirst({ where: { name: 'Route-B' } });
        const product = await prisma.product.findUnique({ where: { sku: 'Route-Prod-1' } });

        // Reset Inventory
        await prisma.productInventory.deleteMany({ where: { productId: product!.id } });
        await prisma.productInventory.create({ data: { productId: product!.id, warehouseId: whA!.id, quantity: 0, reserved: 0 } });
        await prisma.productInventory.create({ data: { productId: product!.id, warehouseId: whB!.id, quantity: 10, reserved: 0 } });

        const cust = await prisma.customer.create({ data: { name: 'Route Cust 2', latitude: 0, longitude: 0 } });

        // Setup Rule: Try A. If Fail -> TRIGGER_TRANSFER
        await prisma.fulfillmentRule.create({
            data: {
                name: 'Rule IWT',
                priority: 1,
                strategy: 'PRIMARY',
                warehouseId: whA!.id,
                actionIfUnavailable: 'TRIGGER_TRANSFER',
                transferSourceRule: JSON.stringify({ warehouseId: whB!.id })
            }
        });

        // Execution
        const order = await orderService.createOrder({ customerId: cust.id, priority: 'NORMAL', items: [{ productId: product!.id, quantity: 5 }] });
        await fulfillmentService.allocateOrder(order.id);

        // Verify
        const updated = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updated!.warehouseId).toBe(whA!.id);
        expect(updated!.fulfillmentStatus).toBe('PARTIAL');

        // Check for transfer
        const recentTransfer = await prisma.transferOrder.findFirst({
            where: { destinationWarehouseId: whA!.id, sourceWarehouseId: whB!.id, initiatorId: 'system-auto-allocation' },
            orderBy: { createdAt: 'desc' }
        });
        expect(recentTransfer).toBeDefined();

        // Cleanup
        await prisma.fulfillmentRule.deleteMany({ where: { name: 'Rule IWT' } });
    });
});
