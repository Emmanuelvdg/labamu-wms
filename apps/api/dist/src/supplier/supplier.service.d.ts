import { PrismaService } from '../prisma.service';
export declare class SupplierService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findOne(id: string): Promise<{
        purchaseOrders: {
            id: string;
            status: string;
            supplierId: string;
            createdAt: Date;
            updatedAt: Date;
            expectedDate: Date | null;
        }[];
    } & {
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
    getProductPriceHistory(productId: string): Promise<{
        date: Date;
        supplierName: string;
        unitCost: number;
        quantity: number;
    }[]>;
}
//# sourceMappingURL=supplier.service.d.ts.map