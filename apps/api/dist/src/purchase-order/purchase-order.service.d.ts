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
    getPurchaseOrders(): Promise<({
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
    receiveGoods(purchaseOrderId: string, destinationLocationId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        purchaseOrderId: string;
        destinationLocationId: string;
    }>;
}
//# sourceMappingURL=purchase-order.service.d.ts.map