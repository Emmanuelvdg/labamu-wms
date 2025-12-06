import { OrderService } from './order.service';
export declare class OrderController {
    private readonly orderService;
    constructor(orderService: OrderService);
    createOrder(data: {
        customerId: string;
        priority: string;
        items: {
            productId: string;
            quantity: number;
        }[];
        expectedDate?: Date;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        customerId: string;
        shippingCarrier: string | null;
        expectedDate: Date | null;
    }>;
    getOrders(): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        customerId: string;
        shippingCarrier: string | null;
        expectedDate: Date | null;
    }[]>;
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
//# sourceMappingURL=order.controller.d.ts.map