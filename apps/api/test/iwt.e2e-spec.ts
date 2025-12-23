
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { FulfillmentService } from '../src/fulfillment/fulfillment.service';
import { OrderService } from '../src/order/order.service';
import { PrismaService } from '../src/prisma.service';

describe('IWT Flow (E2E)', () => {
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
    });

    afterAll(async () => {
        // Cleanup
        await prisma.fulfillmentRule.deleteMany({ where: { name: 'Force-A' } });
        await app.close();
    });

    it('should allocate to primary warehouse and create IWT for deficits', async () => {
        // 1. Setup
        let whA = await prisma.warehouse.findFirst({ where: { name: 'IWT-WH-A' } });
        if (!whA) whA = await prisma.warehouse.create({ data: { name: 'IWT-WH-A', location: '{"lat":0,"lng":0}', type: 'INTERNAL' } });

        let whB = await prisma.warehouse.findFirst({ where: { name: 'IWT-WH-B' } });
        if (!whB) whB = await prisma.warehouse.create({ data: { name: 'IWT-WH-B', location: '{"lat":10,"lng":10}', type: 'INTERNAL' } });

        const product = await prisma.product.upsert({
            where: { sku: 'IWT-PROD-001' },
            update: {},
            create: { sku: 'IWT-PROD-001', name: 'IWT Test Product', category: 'TEST' }
        });

        // Reset Inventory
        await prisma.productInventory.deleteMany({ where: { productId: product.id } });
        await prisma.productInventory.create({ data: { productId: product.id, warehouseId: whB!.id, quantity: 10, reserved: 0 } });
        await prisma.productInventory.create({ data: { productId: product.id, warehouseId: whA!.id, quantity: 0, reserved: 0 } });

        const cust = await prisma.customer.create({ data: { name: 'IWT Customer', latitude: 0, longitude: 0, address: 'Near A' } });

        await prisma.fulfillmentRule.create({
            data: { name: 'Force-A', strategy: 'PRIMARY', warehouseId: whA!.id, priority: 1 }
        });

        // 2. Execute
        const order = await orderService.createOrder({
            customerId: cust.id,
            priority: 'NORMAL',
            items: [{ productId: product.id, quantity: 5 }]
        });

        // Allocation should happen automatically or implicitly, but let's force check in case it was async or failed silently
        // Actually createOrder logs allocation errors but doesn't throw.
        // Let's call allocate manually to be sure for test
        await fulfillmentService.allocateOrder(order.id);

        // 3. Verify
        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updatedOrder).toBeDefined();
        expect(updatedOrder!.warehouseId).toBe(whA!.id);
        expect(updatedOrder!.fulfillmentStatus).toBe('PARTIAL'); // As per code logic

        const transfers = await prisma.transferOrder.findMany({
            where: { destinationWarehouseId: whA!.id, createdAt: { gte: new Date(Date.now() - 10000) } },
            include: { items: true }
        });

        expect(transfers.length).toBeGreaterThan(0);
        const item = transfers[0].items.find(i => i.productId === product.id);
        expect(item).toBeDefined();
        expect(item!.quantity).toBe(5);
    });
});
