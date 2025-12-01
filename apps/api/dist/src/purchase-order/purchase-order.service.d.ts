import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RuleService } from '../rule/rule.service';
export declare class PurchaseOrderService {
    private prisma;
    private inventoryService;
    private ruleService;
    constructor(prisma: PrismaService, inventoryService: InventoryService, ruleService: RuleService);
    createPurchaseOrder(data: {
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
    getPurchaseOrders(): Promise<({
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
    receiveGoods(purchaseOrderId: string, destinationLocationId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        destinationLocationId: string;
        purchaseOrderId: string;
    }>;
}
//# sourceMappingURL=purchase-order.service.d.ts.map