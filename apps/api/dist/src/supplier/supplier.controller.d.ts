import { SupplierService } from './supplier.service';
export declare class SupplierController {
    private readonly supplierService;
    constructor(supplierService: SupplierService);
    create(data: {
        name: string;
        contactInfo?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }>;
    findAll(): Promise<({
        _count: {
            purchaseOrders: number;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
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
            status: string;
            supplierId: string;
            createdAt: Date;
            updatedAt: Date;
            expectedDate: Date | null;
        }[];
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        contactInfo?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }>;
    remove(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }>;
    getOrders(id: string): Promise<{
        totalAmount: number;
        totalItems: number;
        items: {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    }[]>;
}
//# sourceMappingURL=supplier.controller.d.ts.map