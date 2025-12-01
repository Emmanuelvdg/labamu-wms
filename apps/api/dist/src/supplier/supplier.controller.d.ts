import { SupplierService } from './supplier.service';
export declare class SupplierController {
    private readonly supplierService;
    constructor(supplierService: SupplierService);
    create(data: {
        name: string;
        contactInfo?: string;
    }): Promise<{
        id: string;
        name: string;
        contactInfo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<({
        _count: {
            purchaseOrders: number;
        };
    } & {
        id: string;
        name: string;
        contactInfo: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getProductPriceHistory(productId: string): Promise<{
        date: Date;
        supplierName: string;
        unitCost: number;
        quantity: number;
    }[]>;
    findOne(id: string): Promise<{
        stats: {
            totalOrders: number;
            totalSpend: number;
            totalItems: number;
        };
        purchaseOrders: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            supplierId: string;
            status: string;
            expectedDate: Date | null;
        }[];
        id: string;
        name: string;
        contactInfo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, data: {
        name?: string;
        contactInfo?: string;
    }): Promise<{
        id: string;
        name: string;
        contactInfo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        contactInfo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getOrders(id: string): Promise<{
        totalAmount: number;
        totalItems: number;
        items: {
            id: string;
            purchaseOrderId: string;
            productId: string;
            quantity: number;
            unitCost: number;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        status: string;
        expectedDate: Date | null;
    }[]>;
}
//# sourceMappingURL=supplier.controller.d.ts.map