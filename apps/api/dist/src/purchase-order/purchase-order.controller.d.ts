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
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        supplierId: string;
        expectedDate: Date | null;
    }>;
    findAll(): Promise<({
        receipts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            destinationLocationId: string;
            purchaseOrderId: string;
        }[];
        supplier: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contactInfo: string | null;
        };
        items: {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        supplierId: string;
        expectedDate: Date | null;
    })[]>;
    getSuppliers(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        contactInfo: string | null;
    }[]>;
    receive(id: string, data: {
        destinationLocationId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        destinationLocationId: string;
        purchaseOrderId: string;
    }>;
}
//# sourceMappingURL=purchase-order.controller.d.ts.map