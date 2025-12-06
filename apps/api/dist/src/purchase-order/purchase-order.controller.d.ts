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
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    }>;
    findAll(): Promise<({
        supplier: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contactInfo: string | null;
        };
        receipts: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            destinationLocationId: string;
            purchaseOrderId: string;
        }[];
        items: {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    })[]>;
    getSuppliers(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }[]>;
    findOne(id: string): Promise<{
        supplier: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contactInfo: string | null;
        };
        receipts: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            destinationLocationId: string;
            purchaseOrderId: string;
        }[];
        items: ({
            product: {
                name: string;
                id: string;
                sku: string;
                category: string;
                classification: string | null;
                type: string | null;
                unitOfMeasure: string | null;
                isStockable: boolean;
                status: string;
                averageCost: number;
                description: string | null;
                tracking: string;
                expiryDate: Date | null;
                width: number | null;
                height: number | null;
                depth: number | null;
                weight: number | null;
                supplierId: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        })[];
    } & {
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    }>;
    receive(id: string, data: {
        destinationLocationId: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        destinationLocationId: string;
        purchaseOrderId: string;
    }>;
}
//# sourceMappingURL=purchase-order.controller.d.ts.map