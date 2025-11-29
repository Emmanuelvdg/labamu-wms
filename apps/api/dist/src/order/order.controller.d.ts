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
    }): Promise<{
        id: string;
        updatedAt: Date;
        status: string;
        createdAt: Date;
        priority: string;
        customerId: string;
        shippingCarrier: string | null;
    }>;
    getOrders(): Promise<{
        id: string;
        updatedAt: Date;
        status: string;
        createdAt: Date;
        priority: string;
        customerId: string;
        shippingCarrier: string | null;
    }[]>;
    createShipment(data: {
        orderId: string;
        carrier: string;
        trackingId: string;
    }): Promise<{
        id: string;
        status: string;
        carrier: string;
        trackingId: string;
        orderId: string;
    }>;
}
//# sourceMappingURL=order.controller.d.ts.map