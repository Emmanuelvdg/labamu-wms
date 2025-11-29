import { PurchaseOrderService } from './purchase-order.service';
export declare class PurchaseOrderController {
    private readonly purchaseOrderService;
    constructor(purchaseOrderService: PurchaseOrderService);
    create(data: {
        supplierId: string;
        expectedDate?: Date;
        items: {
            productId: string;
            quantity: number;
            unitCost: number;
        }[];
    }): Promise<{
        supplier: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contactInfo: string | null;
        };
        items: {
            id: string;
            quantity: number;
            unitCost: number;
            productId: string;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        status: string;
        expectedDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
    }>;
    findAll(): Promise<({
        supplier: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contactInfo: string | null;
        };
        items: {
            id: string;
            quantity: number;
            unitCost: number;
            productId: string;
            purchaseOrderId: string;
        }[];
        receipts: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            purchaseOrderId: string;
            destinationLocationId: string;
        }[];
    } & {
        id: string;
        status: string;
        expectedDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
    })[]>;
    receive(id: string, data: {
        destinationLocationId: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        purchaseOrderId: string;
        destinationLocationId: string;
    }>;
}
//# sourceMappingURL=purchase-order.controller.d.ts.map