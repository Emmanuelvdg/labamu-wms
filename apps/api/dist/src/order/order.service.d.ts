import { PrismaService } from '../prisma.service';
import { StrategyService } from '../strategy/strategy.service';
import { InventoryService } from '../inventory/inventory.service';
import { Order } from '@labamu/database';
export declare class OrderService {
    private prisma;
    private strategyService;
    private inventoryService;
    constructor(prisma: PrismaService, strategyService: StrategyService, inventoryService: InventoryService);
    createOrder(data: {
        customerId: string;
        priority: string;
        items: {
            productId: string;
            quantity: number;
        }[];
    }): Promise<Order>;
    getOrders(): Promise<Order[]>;
    createShipment(data: {
        orderId: string;
        carrier: string;
        trackingId: string;
    }): Promise<{
        id: string;
        status: string;
        orderId: string;
        carrier: string;
        trackingId: string;
    }>;
}
//# sourceMappingURL=order.service.d.ts.map