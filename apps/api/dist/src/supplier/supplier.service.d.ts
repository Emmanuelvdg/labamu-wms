import { PrismaService } from '../prisma.service';
export declare class SupplierService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findOne(id: string): Promise<{
        purchaseOrders: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            supplierId: string;
            status: string;
            expectedDate: Date | null;
        }[];
    } & {
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
    getSupplierStats(id: string): Promise<{
        totalOrders: number;
        totalSpend: number;
        totalItems: number;
    }>;
    getSupplierOrders(id: string): Promise<{
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
    getProductPriceHistory(productId: string): Promise<{
        date: Date;
        supplierName: string;
        unitCost: number;
        quantity: number;
    }[]>;
}
//# sourceMappingURL=supplier.service.d.ts.map